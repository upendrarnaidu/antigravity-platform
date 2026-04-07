import os
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

def get_llm(model_name: str = "gpt-4o-mini"):
    """Dynamically route to the underlying LLM based on model name."""
    if "claude" in model_name:
        return ChatAnthropic(model_name=model_name, temperature=0.7)
    elif "gemini" in model_name:
        return ChatGoogleGenerativeAI(model=model_name, temperature=0.7)
    elif "deepseek" in model_name:
        return ChatOpenAI(model=model_name, temperature=0.7, openai_api_base="https://api.deepseek.com/v1")
    else:
        return ChatOpenAI(model=model_name, temperature=0.7)

def create_agent(llm, system_prompt: str):
    """Create a LangChain chat agent."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
    ])
    return prompt | llm

# Specialized Team System Prompts
STRATEGIST_PROMPT = """You are an elite Marketing Strategist. 
Your goal is to define the best overall marketing angle, tone, target audience, and campaign themes based on the user's request.
Always be concise, powerful, and definitive. Output clear strategic bullet points."""

COPYWRITER_PROMPT = """You are an Expert Copywriter.
Write highly engaging, viral social media posts. Adapt pacing and structure distinctly for Twitter (hooks, brevity), LinkedIn (stories, paragraphs), and Instagram (visual layout, hashtags)."""

VISUAL_DIR_PROMPT = """You are a Visual Director.
Create incredibly detailed prompt imagery (Midjourney/DALL-E format) for the marketing assets. Include lighting, camera angles, and rendering engines."""

DATA_ANALYST_PROMPT = """You are a Data Analyst.
Identify trending topics and structural formulas for the user's niche. Base decisions on analytical logic."""

CODER_PROMPT = """You are a Principal Software Engineer.
If the user requests technical integrations, automation scripts, or landing page HTML/React code, you must output the COMPLETE, functional code blocks. Prioritize clean, scalable code."""
