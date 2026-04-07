"""
Director Workflow Router
=========================
SSE-streaming endpoint that runs the full Director pipeline:
  Text Phase:  Strategist → Copywriter → VisualDirector
  Media Phase: Voice Engine → Image Renderer → Video Engine

Features:
  - Dynamic provider routing (Google vs ElevenLabs/Replicate)
  - Credit-gated execution (402 if insufficient credits)
  - Real-time SSE progress events for React Flow canvas
"""

import os
import json
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth_router import get_current_user
from firebase_init import db
from credit_system import (
    calculate_pipeline_cost,
    check_and_deduct_credits,
    refund_credits,
    get_user_credits,
    get_credit_history,
    CREDIT_COSTS,
)
from agents import get_llm, create_agent, STRATEGIST_PROMPT, COPYWRITER_PROMPT, VISUAL_DIR_PROMPT

logger = logging.getLogger(__name__)

# ── Request Models ───────────────────────────────────────────
class ProviderPreferences(BaseModel):
    voice_provider: str = "google"   # google | elevenlabs
    image_provider: str = "google"   # google | replicate
    video_provider: str = "google"   # google | replicate

class WorkflowRequest(BaseModel):
    campaign_name: str = "Untitled Campaign"
    niche: str = ""
    audience: str = ""
    tone: str = "Professional"
    goals: str = ""
    video_duration: int = 5  # User-configurable: 5-30 seconds
    preferences: ProviderPreferences = ProviderPreferences()

class WorkflowStatusResponse(BaseModel):
    campaign_id: str
    status: str
    voiceover_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None

class CostEstimateRequest(BaseModel):
    voice_provider: str = "google"
    image_provider: str = "google"
    video_provider: str = "google"


# ── Router ───────────────────────────────────────────────────
router = APIRouter(prefix="/api/workflow", tags=["Director Workflow"])


def _run_text_agent(agent_prompt: str, agent_name: str, messages: list) -> str:
    """Run a single text agent and return its output."""
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    llm = get_llm("gpt-4o-mini")
    agent = create_agent(llm, agent_prompt)
    result = agent.invoke({"messages": messages})
    return result.content


# ── Cost Estimation Endpoint ─────────────────────────────────
@router.post("/estimate-cost")
async def estimate_cost(req: CostEstimateRequest, user: dict = Depends(get_current_user)):
    """
    Calculate the credit cost for a pipeline run based on provider selections.
    Returns cost breakdown and user's current balance.
    """
    preferences = {
        "voice_provider": req.voice_provider,
        "image_provider": req.image_provider,
        "video_provider": req.video_provider,
    }

    total_cost = calculate_pipeline_cost(preferences)
    current_credits = get_user_credits(user["user_id"])

    return {
        "total_cost": total_cost,
        "current_credits": current_credits,
        "can_afford": current_credits >= total_cost,
        "deficit": max(0, total_cost - current_credits),
        "breakdown": {
            "text": sum(CREDIT_COSTS["text"].values()),
            "voice": CREDIT_COSTS["voice"].get(req.voice_provider, 2),
            "image": CREDIT_COSTS["image"].get(req.image_provider, 2),
            "video": CREDIT_COSTS["video"].get(req.video_provider, 5),
        },
        "pricing": CREDIT_COSTS,
    }


# ── Credit Wallet Endpoints ─────────────────────────────────
@router.get("/credits")
async def get_credits(user: dict = Depends(get_current_user)):
    """Get the user's current credit balance."""
    try:
        credits = get_user_credits(user["user_id"])
        return {"credits": credits, "user_id": user["user_id"]}
    except Exception as e:
        logger.error(f"Failed to fetch credits for user {user.get('user_id')}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "credits_fetch_failed", "message": str(e)}
        )


@router.get("/credits/history")
async def get_credits_history(user: dict = Depends(get_current_user)):
    """Get the user's credit transaction history."""
    history = get_credit_history(user["user_id"])
    return {"transactions": history}


# ── SSE Streaming Workflow ───────────────────────────────────
async def _stream_workflow(campaign_id: str, params: dict, user: dict, preferences: dict, credit_cost: int = 0):
    """
    Generator that yields SSE events as the Director pipeline executes.
    Runs the full text + media pipeline and streams progress.
    Credits are already deducted before this runs.

    If the text phase fails entirely, credits are refunded automatically.
    """
    from langchain_core.messages import HumanMessage
    import redis as redis_lib

    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    try:
        redis_client = redis_lib.Redis.from_url(redis_url)
    except Exception:
        redis_client = None

    session_id = campaign_id
    video_duration = max(5, min(30, params.get("video_duration", 5)))

    def emit(agent: str, status: str, progress: int, data: dict = None):
        payload = {
            "agent": agent,
            "status": status,
            "progress": progress,
            "campaign_id": campaign_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if data:
            payload.update(data)
        return f"data: {json.dumps(payload)}\n\n"

    # ── Save initial campaign to Firestore ────────────────────
    try:
        db.collection("campaigns").document(campaign_id).set({
            "user_id": user.get("user_id", ""),
            "name": params.get("campaign_name", ""),
            "niche": params.get("niche", ""),
            "audience": params.get("audience", ""),
            "tone": params.get("tone", ""),
            "goals": params.get("goals", ""),
            "status": "processing",
            "preferences": preferences,
            "voiceover_url": "",
            "thumbnail_url": "",
            "video_url": "",
            "video_duration": video_duration,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })
    except Exception as e:
        logger.error(f"Failed to create campaign document: {e}")

    # Build the initial user message
    user_message = (
        f"Create a complete marketing campaign for:\n"
        f"- Campaign: {params.get('campaign_name', 'Marketing Campaign')}\n"
        f"- Niche: {params.get('niche', 'General')}\n"
        f"- Target Audience: {params.get('audience', 'General')}\n"
        f"- Tone: {params.get('tone', 'Professional')}\n"
        f"- Goals: {params.get('goals', 'Brand awareness')}"
    )
    messages = [HumanMessage(content=user_message)]

    # ═══════════════════════════════════════════════════════════
    # TEXT PHASE
    # ═══════════════════════════════════════════════════════════

    # ── 1. Strategist ─────────────────────────────────────────
    yield emit("Strategist", "running", 10)
    try:
        await asyncio.sleep(0.1)
        strategy_output = await asyncio.to_thread(
            _run_text_agent, STRATEGIST_PROMPT, "Strategist", messages
        )
        messages.append(HumanMessage(content=f"Strategy output:\n{strategy_output}"))
        yield emit("Strategist", "done", 100, {"output_preview": strategy_output[:200]})
    except Exception as e:
        yield emit("Strategist", "error", 0, {"error": str(e)})
        # Refund credits on text phase failure (no media consumed)
        if credit_cost > 0:
            refund_credits(user.get("user_id", ""), credit_cost, reason=f"text_phase_failure_{campaign_id}")
            yield emit("Pipeline", "refunded", 0, {"credits_refunded": credit_cost})
        return

    # ── 2. Copywriter ─────────────────────────────────────────
    yield emit("Copywriter", "running", 10)
    try:
        await asyncio.sleep(0.1)
        copy_prompt = f"Based on this strategy, write compelling marketing copy:\n{strategy_output}"
        copy_messages = messages + [HumanMessage(content=copy_prompt)]
        copywriter_output = await asyncio.to_thread(
            _run_text_agent, COPYWRITER_PROMPT, "Copywriter", copy_messages
        )
        messages.append(HumanMessage(content=f"Copy output:\n{copywriter_output}"))
        yield emit("Copywriter", "done", 100, {"output_preview": copywriter_output[:200]})
    except Exception as e:
        yield emit("Copywriter", "error", 0, {"error": str(e)})
        if credit_cost > 0:
            refund_credits(user.get("user_id", ""), credit_cost, reason=f"text_phase_failure_{campaign_id}")
            yield emit("Pipeline", "refunded", 0, {"credits_refunded": credit_cost})
        return

    # ── 3. Visual Director ────────────────────────────────────
    yield emit("VisualDirector", "running", 10)
    try:
        await asyncio.sleep(0.1)
        visual_prompt_msg = f"Create a detailed visual prompt for this campaign:\n{strategy_output}\n\nCopy:\n{copywriter_output[:500]}"
        vis_messages = messages + [HumanMessage(content=visual_prompt_msg)]
        visual_output = await asyncio.to_thread(
            _run_text_agent, VISUAL_DIR_PROMPT, "VisualDirector", vis_messages
        )
        yield emit("VisualDirector", "done", 100, {"output_preview": visual_output[:200]})
    except Exception as e:
        yield emit("VisualDirector", "error", 0, {"error": str(e)})
        if credit_cost > 0:
            refund_credits(user.get("user_id", ""), credit_cost, reason=f"text_phase_failure_{campaign_id}")
            yield emit("Pipeline", "refunded", 0, {"credits_refunded": credit_cost})
        return

    # Save text results to Firestore
    try:
        db.collection("campaigns").document(campaign_id).update({
            "strategy_output": strategy_output[:5000],
            "copywriter_output": copywriter_output[:5000],
            "visual_prompt": visual_output[:3000],
            "status": "media_processing",
            "updated_at": datetime.now(timezone.utc),
        })
    except Exception as e:
        logger.error(f"Firestore text update failed: {e}")

    # ═══════════════════════════════════════════════════════════
    # MEDIA PHASE — Dynamic Provider Routing
    # ═══════════════════════════════════════════════════════════
    from media_agents import generate_voiceover, generate_thumbnail, generate_video

    voice_provider = preferences.get("voice_provider", "google")
    image_provider = preferences.get("image_provider", "google")
    video_provider = preferences.get("video_provider", "google")

    # ── 4. Voice Engine ───────────────────────────────────────
    yield emit("VoiceEngine", "running", 10, {"provider": voice_provider})
    try:
        voiceover_url = await asyncio.to_thread(
            generate_voiceover,
            copywriter_output[:2000],
            campaign_id,
            redis_client=redis_client,
            session_id=session_id,
            provider=voice_provider,
        )
        if voiceover_url:
            yield emit("VoiceEngine", "done", 100, {"url": voiceover_url, "provider": voice_provider})
        else:
            yield emit("VoiceEngine", "skipped", 100, {"reason": "Generation failed or API not configured"})
    except Exception as e:
        yield emit("VoiceEngine", "error", 0, {"error": str(e)})

    # ── 5. Image Renderer ─────────────────────────────────────
    yield emit("ImageRenderer", "running", 10, {"provider": image_provider})
    try:
        thumbnail_url = await asyncio.to_thread(
            generate_thumbnail,
            visual_output,
            campaign_id,
            redis_client=redis_client,
            session_id=session_id,
            provider=image_provider,
        )
        if thumbnail_url:
            yield emit("ImageRenderer", "done", 100, {"url": thumbnail_url, "provider": image_provider})
        else:
            yield emit("ImageRenderer", "skipped", 100, {"reason": "Generation failed or API not configured"})
    except Exception as e:
        yield emit("ImageRenderer", "error", 0, {"error": str(e)})
        thumbnail_url = ""

    # ── 6. Video Engine ───────────────────────────────────────
    yield emit("VideoEngine", "running", 10, {"provider": video_provider})
    try:
        if thumbnail_url:
            video_url = await asyncio.to_thread(
                generate_video,
                thumbnail_url,
                campaign_id,
                redis_client=redis_client,
                session_id=session_id,
                duration_seconds=video_duration,
                provider=video_provider,
            )
            if video_url:
                yield emit("VideoEngine", "done", 100, {"url": video_url, "duration": video_duration, "provider": video_provider})
            else:
                yield emit("VideoEngine", "skipped", 100, {"reason": "Generation failed"})
        else:
            yield emit("VideoEngine", "skipped", 100, {"reason": "No thumbnail available for animation"})
            video_url = ""
    except Exception as e:
        yield emit("VideoEngine", "error", 0, {"error": str(e)})
        video_url = ""

    # ═══════════════════════════════════════════════════════════
    # COMPLETE
    # ═══════════════════════════════════════════════════════════
    try:
        db.collection("campaigns").document(campaign_id).update({
            "status": "completed",
            "updated_at": datetime.now(timezone.utc),
        })
    except Exception as e:
        logger.error(f"Final Firestore update failed: {e}")

    yield emit("Pipeline", "complete", 100, {
        "voiceover_url": voiceover_url if 'voiceover_url' in dir() else "",
        "thumbnail_url": thumbnail_url if 'thumbnail_url' in dir() else "",
        "video_url": video_url if 'video_url' in dir() else "",
    })


@router.post("/execute")
async def execute_workflow(
    req: WorkflowRequest,
    user: dict = Depends(get_current_user),
):
    """
    Execute the full Director pipeline with SSE-streamed progress events.

    Pre-flight:
    1. Calculate credit cost based on provider preferences
    2. Check user has sufficient credits → deduct → proceed
    3. If insufficient, return 402 with details for paywall

    Returns a streaming response with real-time updates for each agent.
    """
    campaign_id = str(uuid.uuid4())

    preferences = {
        "voice_provider": req.preferences.voice_provider,
        "image_provider": req.preferences.image_provider,
        "video_provider": req.preferences.video_provider,
    }

    # ── Credit Gate ───────────────────────────────────────────
    try:
        # This will raise HTTPException(402) if insufficient credits
        cost = check_and_deduct_credits(
            user["user_id"],
            preferences,
            reason=f"pipeline_{campaign_id}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Credit deduction crash for user {user.get('user_id')}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "credit_system_error", "message": "An unexpected error occurred in the credit system."}
        )

    params = {
        "campaign_name": req.campaign_name,
        "niche": req.niche,
        "audience": req.audience,
        "tone": req.tone,
        "goals": req.goals,
        "video_duration": req.video_duration,
    }

    logger.info(f"🎬 Director Workflow: {campaign_id} | Cost: {cost} credits | "
                f"Providers: {preferences} | User: {user.get('user_id')}")

    try:
        return StreamingResponse(
            _stream_workflow(campaign_id, params, user, preferences, credit_cost=cost),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Campaign-Id": campaign_id,
                "X-Credits-Deducted": str(cost),
            },
        )
    except Exception as e:
        logger.error(f"StreamingResponse creation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail={"error": "streaming_error", "message": "Failed to initiate progress stream."}
        )


@router.get("/{campaign_id}/status", response_model=WorkflowStatusResponse)
async def get_workflow_status(
    campaign_id: str,
    user: dict = Depends(get_current_user),
):
    """Get the current status and media URLs for a workflow/campaign."""
    doc = db.collection("campaigns").document(campaign_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Campaign not found")

    data = doc.to_dict()

    if data.get("user_id") != user.get("user_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    return WorkflowStatusResponse(
        campaign_id=campaign_id,
        status=data.get("status", "unknown"),
        voiceover_url=data.get("voiceover_url"),
        thumbnail_url=data.get("thumbnail_url"),
        video_url=data.get("video_url"),
    )
