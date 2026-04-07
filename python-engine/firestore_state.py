"""
Firestore Agent State Persistence
===================================
Saves and loads LangGraph AgentState to/from Firestore `campaigns` collection.
This makes the Python engine stateless — any instance can pick up any workflow.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from firebase_init import db

logger = logging.getLogger(__name__)


def save_campaign_state(
    campaign_id: str,
    state: dict,
    *,
    user_id: str = None,
    workspace_id: str = None,
    name: str = None,
    niche: str = None,
    status: str = "processing",
):
    """
    Persist the LangGraph AgentState to Firestore after every agent step.
    
    Args:
        campaign_id: Unique campaign identifier
        state: The LangGraph AgentState TypedDict (messages, next, token_usage)
        user_id: Owner of the campaign
        workspace_id: Workspace scope
        name: Campaign name
        niche: Campaign niche/topic
        status: Campaign status (draft, processing, completed, live)
    """
    try:
        # Serialize LangChain messages to plain dicts
        serialized_messages = []
        for msg in state.get("messages", []):
            serialized_messages.append({
                "role": getattr(msg, "type", "unknown"),
                "content": getattr(msg, "content", str(msg)),
                "name": getattr(msg, "name", None),
            })

        doc_data = {
            "agent_state": {
                "messages": serialized_messages,
                "next": state.get("next", ""),
                "token_usage": state.get("token_usage", 0),
                "voiceover_url": state.get("voiceover_url", ""),
                "thumbnail_url": state.get("thumbnail_url", ""),
                "video_url": state.get("video_url", ""),
                "visual_prompt": state.get("visual_prompt", ""),
            },
            "status": status,
            "updated_at": datetime.now(timezone.utc),
        }

        # Add metadata fields only on first save (creation)
        campaign_ref = db.collection("campaigns").document(campaign_id)
        existing = campaign_ref.get()

        if not existing.exists:
            doc_data.update({
                "user_id": user_id or "",
                "workspace_id": workspace_id or "",
                "name": name or "",
                "niche": niche or "",
                "created_at": datetime.now(timezone.utc),
            })
            campaign_ref.set(doc_data)
            logger.info(f"📦 Created campaign state in Firestore: {campaign_id}")
        else:
            campaign_ref.update(doc_data)
            logger.info(f"📦 Updated campaign state in Firestore: {campaign_id}")

    except Exception as e:
        logger.error(f"❌ Failed to save campaign state to Firestore: {e}")
        raise


def save_campaign_results(campaign_id: str, final_posts: list):
    """
    Save the final generated posts to the campaign document in Firestore.
    Called when the LangGraph workflow completes.
    """
    try:
        campaign_ref = db.collection("campaigns").document(campaign_id)
        campaign_ref.update({
            "final_posts": final_posts,
            "status": "completed",
            "updated_at": datetime.now(timezone.utc),
        })
        logger.info(f"✅ Campaign {campaign_id} results saved ({len(final_posts)} posts)")
    except Exception as e:
        logger.error(f"❌ Failed to save campaign results: {e}")
        raise


def load_campaign_state(campaign_id: str) -> Optional[dict]:
    """
    Load a campaign's agent state from Firestore.
    Returns the full document dict or None if not found.
    """
    try:
        doc = db.collection("campaigns").document(campaign_id).get()
        if doc.exists:
            data = doc.to_dict()
            logger.info(f"📂 Loaded campaign state: {campaign_id}")
            return data
        else:
            logger.warning(f"⚠️ Campaign {campaign_id} not found in Firestore")
            return None
    except Exception as e:
        logger.error(f"❌ Failed to load campaign state: {e}")
        return None


def update_campaign_status(campaign_id: str, status: str):
    """Update just the status field of a campaign."""
    try:
        db.collection("campaigns").document(campaign_id).update({
            "status": status,
            "updated_at": datetime.now(timezone.utc),
        })
    except Exception as e:
        logger.error(f"❌ Failed to update campaign status: {e}")


def save_media_urls(campaign_id: str, urls: dict):
    """
    Batch-update media URLs on a campaign document.
    
    Args:
        campaign_id: Campaign document ID
        urls: Dict with keys like 'voiceover_url', 'thumbnail_url', 'video_url'
    """
    try:
        update_data = {"updated_at": datetime.now(timezone.utc)}
        for field in ["voiceover_url", "thumbnail_url", "video_url"]:
            if field in urls and urls[field]:
                update_data[field] = urls[field]
        
        db.collection("campaigns").document(campaign_id).update(update_data)
        logger.info(f"🎬 Saved media URLs for campaign {campaign_id}: {list(urls.keys())}")
    except Exception as e:
        logger.error(f"❌ Failed to save media URLs: {e}")


def get_user_campaigns(user_id: str) -> list:
    """Get all campaigns for a user, ordered by creation date."""
    try:
        from google.cloud.firestore_v1 import FieldFilter
        campaigns = (
            db.collection("campaigns")
            .where(filter=FieldFilter("user_id", "==", user_id))
            .order_by("created_at", direction="DESCENDING")
            .stream()
        )
        results = []
        for doc in campaigns:
            data = doc.to_dict()
            data["id"] = doc.id
            # Don't send the full agent_state in list views
            data.pop("agent_state", None)
            results.append(data)
        return results
    except Exception as e:
        logger.error(f"❌ Failed to get campaigns for user {user_id}: {e}")
        return []
