import os
import json
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from kafka import KafkaConsumer, KafkaProducer
import redis
import tiktoken
from typing import Annotated, Sequence, TypedDict
import operator

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.callbacks import BaseCallbackHandler
from langgraph.graph import StateGraph, START, END

from agents import get_llm, create_agent, STRATEGIST_PROMPT, COPYWRITER_PROMPT, VISUAL_DIR_PROMPT, DATA_ANALYST_PROMPT, CODER_PROMPT

# ── Firebase / Firestore ──────────────────────────────────────
from firebase_init import db as firestore_db
from firestore_state import save_campaign_state, save_campaign_results

logging.basicConfig(level=logging.INFO)
KAFKA_BROKERS = os.environ.get("KAFKA_BROKERS", "localhost:9092")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
redis_client = redis.Redis.from_url(REDIS_URL)

# ---------------------------------------------------------
# Streaming Callback for UI (Real-time Token Pub/Sub)
# ---------------------------------------------------------
class RedisStreamingCallback(BaseCallbackHandler):
    def __init__(self, session_id):
        self.session_id = session_id
        self.total_tokens = 0
        
    def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.total_tokens += 1
        # Stream chunks directly to connected Frontend WebSocket via Node Redis-Subscription
        payload = json.dumps({"type": "chunk", "content": token})
        redis_client.publish(f"chat_updates:{self.session_id}", payload)

# ---------------------------------------------------------
# LangGraph Supervisor Setup
# ---------------------------------------------------------
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next: str
    token_usage: Annotated[int, operator.add]
    # Multi-Modal media URLs (populated after text phase)
    voiceover_url: str
    thumbnail_url: str
    video_url: str
    visual_prompt: str
    # Dynamic provider routing preferences
    preferences: dict  # {"voice_provider": "google", "image_provider": "google", "video_provider": "google"}

def supervisor_node(state: AgentState):
    """The Manager assigning tasks to the team."""
    llm = get_llm("gpt-4o") # Manager needs high reasoning
    members = ["Strategist", "Copywriter", "VisualDirector", "DataAnalyst", "Coder"]
    
    system_prompt = f"""You are the Marketing Supervisor. Your team: {", ".join(members)}.
    Review the conversation history. Assign the next task to the relevant technical member.
    If the requested task is fulfilled and complete, respond strictly with "FINISH".
    Return ONLY the exact name of the next member, or "FINISH"."""
    
    # We do NOT stream supervisor routing logic to the user UI
    response = llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])
    next_node = response.content.strip()
    if next_node not in members:
        next_node = "FINISH"
    return {"next": next_node, "token_usage": 150} # Approx static cost for routing

def make_agent_node(agent_prompt: str, name: str):
    def node(state: AgentState, config: dict):
        session_id = config.get("configurable", {}).get("session_id", "default")
        campaign_id = config.get("configurable", {}).get("campaign_id", None)
        streaming_cb = RedisStreamingCallback(session_id)
        
        # We signal the UI that a specific agent is typing
        header = f"\n\n**[{name}]**\n"
        redis_client.publish(f"chat_updates:{session_id}", json.dumps({"type": "chunk", "content": header}))
        
        llm = get_llm("gpt-4o-mini").with_config(callbacks=[streaming_cb])
        agent = create_agent(llm, agent_prompt)
        
        result = agent.invoke({"messages": state["messages"]})
        final_msg = AIMessage(content=f"{header}{result.content}", name=name)
        
        new_state = {"messages": [final_msg], "token_usage": streaming_cb.total_tokens + 250}
        
        # ── Persist to Firestore after every agent step ──
        if campaign_id:
            try:
                merged_state = {
                    "messages": list(state.get("messages", [])) + [final_msg],
                    "next": name,
                    "token_usage": state.get("token_usage", 0) + streaming_cb.total_tokens + 250,
                }
                save_campaign_state(campaign_id, merged_state)
            except Exception as e:
                logging.error(f"Firestore save failed for campaign {campaign_id}: {e}")
        
        return new_state
    return node

workflow = StateGraph(AgentState)
workflow.add_node("Supervisor", supervisor_node)
workflow.add_node("Strategist", make_agent_node(STRATEGIST_PROMPT, "Strategist"))
workflow.add_node("Copywriter", make_agent_node(COPYWRITER_PROMPT, "Copywriter"))
workflow.add_node("VisualDirector", make_agent_node(VISUAL_DIR_PROMPT, "VisualDirector"))
workflow.add_node("DataAnalyst", make_agent_node(DATA_ANALYST_PROMPT, "DataAnalyst"))
workflow.add_node("Coder", make_agent_node(CODER_PROMPT, "Coder"))

workflow.add_edge(START, "Supervisor")
for member in ["Strategist", "Copywriter", "VisualDirector", "DataAnalyst", "Coder"]:
    workflow.add_edge(member, "Supervisor")

workflow.add_conditional_edges("Supervisor", lambda x: x["next"], {
    "Strategist": "Strategist", "Copywriter": "Copywriter", 
    "VisualDirector": "VisualDirector", "DataAnalyst": "DataAnalyst", 
    "Coder": "Coder", "FINISH": END
})

team_orchestrator = workflow.compile()

# ---------------------------------------------------------
# Scale: Threaded Kafka Worker
# ---------------------------------------------------------
def process_chat_message(payload):
    session_id = payload.get("session_id")
    user_id = payload.get("user_id")
    history = payload.get("history", [])
    new_message = payload.get("message", "")
    
    logging.info(f"[{session_id}] Processing Team Graph for User {user_id}")
    
    # Load past DB history into Langchain Messages
    msgs = []
    for h in history:
        if h["role"] == "user": msgs.append(HumanMessage(content=h["content"]))
        else: msgs.append(AIMessage(content=h["content"]))
    msgs.append(HumanMessage(content=new_message))
    
    initial_state = {
        "messages": msgs,
        "token_usage": 0
    }
    
    try:
        final_state = team_orchestrator.invoke(initial_state, config={"configurable": {"session_id": session_id}})
        total_tokens = final_state.get("token_usage", 0)
        
        # Signal completion to Node-API with total tokens to deduct!
        redis_client.publish(f"chat_updates:{session_id}", json.dumps({
            "type": "done", 
            "total_tokens": total_tokens
        }))
        logging.info(f"[{session_id}] Finished. Tokens used: {total_tokens}")
    except Exception as e:
        logging.error(f"Graph Error: {e}")
        redis_client.publish(f"chat_updates:{session_id}", json.dumps({"type": "error", "content": str(e)}))

def process_campaign_request(payload):
    campaign_id = payload.get("campaign_id")
    user_id = payload.get("user_id", "")
    workspace_id = payload.get("workspace_id", "")
    
    logging.info(f"Generating campaign {campaign_id}...")
    
    # ── Save initial state to Firestore ──
    try:
        save_campaign_state(
            campaign_id,
            {"messages": [], "next": "", "token_usage": 0},
            user_id=user_id,
            workspace_id=workspace_id,
            name=payload.get("name", ""),
            niche=payload.get("niche", ""),
            status="processing",
        )
    except Exception as e:
        logging.error(f"Failed to create initial campaign state: {e}")
    
    llm = get_llm("gpt-4o-mini")
    prompt = f"Write 3 short social media posts for: Niche: {payload.get('niche')}, Audience: {payload.get('audience')}, Tone: {payload.get('tone')}, Goals: {payload.get('goals')}. Output ONLY a JSON array of strings."
    
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        # Clean markdown wrappers if any
        content = response.content.replace('```json', '').replace('```', '').strip()
        posts_text = json.loads(content)
        
        final_posts = []
        platforms = ["Twitter", "LinkedIn", "Facebook"]
        for i, p in enumerate(posts_text):
            final_posts.append({"platform": platforms[i % len(platforms)], "content": p})
        
        # ── Save results to Firestore ──
        try:
            save_campaign_results(campaign_id, final_posts)
        except Exception as e:
            logging.error(f"Failed to save campaign results to Firestore: {e}")
        
        # ── Multi-Modal Media Pipeline ──
        try:
            from media_agents import run_media_pipeline
            # Extract a visual prompt from the generated content
            visual_prompt = f"Marketing visual for {payload.get('niche', 'brand')}: {posts_text[0][:200] if posts_text else 'professional ad'}"
            script_text = posts_text[0] if posts_text else "Welcome to our brand."
            
            video_duration = payload.get("video_duration", 5)
            
            # Read provider preferences from the Kafka payload
            preferences = payload.get("preferences", {})

            media_results = run_media_pipeline(
                campaign_id,
                script_text,
                visual_prompt,
                redis_client=redis_client,
                session_id=campaign_id,
                video_duration=video_duration,
                preferences=preferences,
            )
            logging.info(f"Media pipeline results: {json.dumps({k: bool(v) for k, v in media_results.items()})}")
        except Exception as media_err:
            logging.error(f"Media pipeline error (non-fatal): {media_err}")
        
        # ── Also publish to Kafka for Node.js to consume ──
        producer = KafkaProducer(
            bootstrap_servers=[KAFKA_BROKERS],
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )
        producer.send('campaign_results', value={"campaign_id": campaign_id, "final_posts": final_posts})
        producer.flush()
        logging.info(f"Campaign {campaign_id} complete.")
    except Exception as e:
        logging.error(f"Campaign Generation failed: {e}")
        # Update Firestore with failure status
        try:
            from firestore_state import update_campaign_status
            update_campaign_status(campaign_id, "failed")
        except Exception:
            pass

def start_kafka_consumer():
    consumer = KafkaConsumer(
        'chat_requests',
        'campaign_start_requests',
        bootstrap_servers=[KAFKA_BROKERS],
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='python-chat-workers',
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )
    logging.info("Python Marketing Agent Team listening on `chat_requests` and `campaign_start_requests`...")
    
    # Horizontal scaling: execute each Kafka message in its own thread to prevent Head-of-Line Blocking for 1M users
    with ThreadPoolExecutor(max_workers=100) as executor:
        for message in consumer:
            if message.topic == 'chat_requests':
                executor.submit(process_chat_message, message.value)
            elif message.topic == 'campaign_start_requests':
                executor.submit(process_campaign_request, message.value)


# ---------------------------------------------------------
# Entrypoint: Run FastAPI + Kafka Consumer in parallel
# ---------------------------------------------------------
if __name__ == "__main__":
    from api_server import start_api_server

    # Start FastAPI in a daemon thread
    api_thread = threading.Thread(target=start_api_server, daemon=True)
    api_thread.start()
    logging.info("✅ FastAPI server thread started (port 8000)")

    # Start Kafka consumer in the main thread
    try:
        start_kafka_consumer()
    except KeyboardInterrupt:
        logging.info("👋 Shutting down...")
    except Exception as e:
        logging.warning(f"Kafka consumer not available ({e}). Running API-only mode.")
        # If Kafka is not running, keep the API server alive
        api_thread.join()
