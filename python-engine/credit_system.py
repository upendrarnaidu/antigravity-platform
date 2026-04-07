"""
Credit System & Provider Cost Engine
=======================================
Manages user credit wallets, cost calculation based on provider selection,
and the @require_credits decorator for pre-flight credit checks.

Credit Pricing:
  Google (default):    Voice=2, Image=2, Video=5, Text=1  → Full pipeline: 11 credits
  ElevenLabs:          Voice=5                              → Premium voice
  Replicate Flux:      Image=4                              → Premium image
  Replicate Luma Ray:  Video=10                             → Premium video

Atomicity:
  Credit deductions use Firestore transactions to prevent race conditions.
  Two concurrent pipeline requests cannot both read the same balance and
  both succeed — the transaction retry loop guarantees serialization.
"""

import logging
import functools
from datetime import datetime, timezone
from typing import Optional, Callable

from fastapi import HTTPException, Depends, Request

from firebase_init import db
from firebase_admin import firestore

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# CREDIT PRICING — per provider per agent
# ═══════════════════════════════════════════════════════════════
CREDIT_COSTS = {
    "text": {
        "strategist": 1,
        "copywriter": 1,
        "visual_director": 1,
    },
    "voice": {
        "google": 2,
        "elevenlabs": 5,
    },
    "image": {
        "google": 2,
        "replicate": 4,
    },
    "video": {
        "google": 5,
        "replicate": 10,
    },
}

# Free tier starting credits
FREE_TIER_CREDITS = 20


def calculate_pipeline_cost(preferences: dict = None) -> int:
    """
    Calculate total credit cost for a full Director pipeline run
    based on user's provider preferences.

    Args:
        preferences: Dict with keys like 'voice_provider', 'image_provider', 'video_provider'
                     Values: 'google' (default/cheap) or 'elevenlabs'/'replicate' (premium)

    Returns:
        Total credit cost as integer
    """
    prefs = preferences or {}
    voice_provider = prefs.get("voice_provider", "google")
    image_provider = prefs.get("image_provider", "google")
    video_provider = prefs.get("video_provider", "google")

    # Text phase is fixed cost
    text_cost = sum(CREDIT_COSTS["text"].values())  # 3

    # Media phase depends on provider selection
    voice_cost = CREDIT_COSTS["voice"].get(voice_provider, CREDIT_COSTS["voice"]["google"])
    image_cost = CREDIT_COSTS["image"].get(image_provider, CREDIT_COSTS["image"]["google"])
    video_cost = CREDIT_COSTS["video"].get(video_provider, CREDIT_COSTS["video"]["google"])

    total = text_cost + voice_cost + image_cost + video_cost
    logger.debug(f"💰 Pipeline cost: text={text_cost} + voice={voice_cost} ({voice_provider}) "
                 f"+ image={image_cost} ({image_provider}) + video={video_cost} ({video_provider}) = {total}")
    return total


def get_user_credits(user_id: str) -> int:
    """Get the current credit balance for a user from Firestore."""
    try:
        doc = db.collection("users").document(user_id).get()
        if doc.exists:
            return doc.to_dict().get("credits", 0)
        return 0
    except Exception as e:
        logger.error(f"Failed to read credits for {user_id}: {e}")
        return 0


def deduct_credits(user_id: str, amount: int, reason: str = "") -> bool:
    """
    Atomically deduct credits from a user's wallet using a Firestore
    transaction. This guarantees that two concurrent requests cannot
    both read the same balance and both succeed.

    Returns True if deduction succeeded, False if insufficient credits.
    """
    user_ref = db.collection("users").document(user_id)

    @firestore.transactional
    def _deduct_in_transaction(txn, ref, cost):
        snapshot = ref.get(transaction=txn)
        if not snapshot.exists:
            raise ValueError(f"User {user_id} not found")

        current = snapshot.to_dict().get("credits", 0)
        if current < cost:
            raise ValueError(
                f"Insufficient credits: has {current}, needs {cost}"
            )

        new_balance = current - cost
        txn.update(ref, {
            "credits": new_balance,
            "updated_at": datetime.now(timezone.utc),
        })
        return current, new_balance

    try:
        txn = db.transaction()
        current_credits, new_balance = _deduct_in_transaction(txn, user_ref, amount)

        # Log the transaction outside the Firestore txn (append-only, safe)
        db.collection("credit_transactions").add({
            "user_id": user_id,
            "type": "debit",
            "amount": -amount,
            "balance_before": current_credits,
            "balance_after": new_balance,
            "reason": reason or "pipeline_execution",
            "created_at": datetime.now(timezone.utc),
        })

        logger.info(
            f"💳 Deducted {amount} credits from {user_id} "
            f"({current_credits} → {new_balance})"
        )
        return True

    except ValueError as ve:
        logger.warning(f"⚠️ {ve}")
        return False
    except Exception as e:
        logger.error(f"❌ Credit deduction failed for {user_id}: {e}")
        return False


def add_credits(user_id: str, amount: int, reason: str = "topup") -> int:
    """
    Atomically add credits to a user's wallet using a Firestore transaction.
    Returns new balance, or -1 on failure.
    """
    user_ref = db.collection("users").document(user_id)

    @firestore.transactional
    def _add_in_transaction(txn, ref, credit_amount):
        snapshot = ref.get(transaction=txn)
        if not snapshot.exists:
            raise ValueError(f"User {user_id} not found")

        current = snapshot.to_dict().get("credits", 0)
        new_balance = current + credit_amount
        txn.update(ref, {
            "credits": new_balance,
            "updated_at": datetime.now(timezone.utc),
        })
        return current, new_balance

    try:
        txn = db.transaction()
        current_credits, new_balance = _add_in_transaction(txn, user_ref, amount)

        db.collection("credit_transactions").add({
            "user_id": user_id,
            "type": "credit",
            "amount": amount,
            "balance_before": current_credits,
            "balance_after": new_balance,
            "reason": reason,
            "created_at": datetime.now(timezone.utc),
        })

        logger.info(f"💰 Added {amount} credits to {user_id} ({current_credits} → {new_balance})")
        return new_balance

    except Exception as e:
        logger.error(f"❌ Credit addition failed: {e}")
        return -1


def require_credits(cost: int = None, use_preferences: bool = False):
    """
    FastAPI dependency factory that checks and deducts credits before a route runs.

    Usage as fixed-cost guard:
        @router.post("/generate")
        async def generate(
            req: Request,
            user: dict = Depends(get_current_user),
            credit_info: dict = Depends(require_credits(cost=5)),
        ):
            # credit_info = {"cost": 5, "balance_before": 20, "balance_after": 15}

    Usage with dynamic preferences (reads 'preferences' from JSON body):
        @router.post("/execute")
        async def execute(
            req: WorkflowRequest,
            user: dict = Depends(get_current_user),
            credit_info: dict = Depends(require_credits(use_preferences=True)),
        ):
            pass
    """

    async def _credit_dependency(request: Request):
        # Resolve user from auth header at call time (avoids circular import)
        from auth_router import get_current_user
        from fastapi.security import HTTPBearer

        security = HTTPBearer(auto_error=False)
        credentials = await security(request)
        user = await get_current_user(credentials)

        # Determine cost
        if use_preferences:
            # Parse preferences from the JSON body
            try:
                body = await request.json()
                preferences = body.get("preferences", {})
                if isinstance(preferences, dict):
                    effective_cost = calculate_pipeline_cost(preferences)
                else:
                    effective_cost = calculate_pipeline_cost()
            except Exception:
                effective_cost = calculate_pipeline_cost()
        elif cost is not None:
            effective_cost = cost
        else:
            effective_cost = calculate_pipeline_cost()  # default Google pipeline

        # Check and deduct
        current_balance = get_user_credits(user["user_id"])
        if current_balance < effective_cost:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "insufficient_credits",
                    "message": f"This operation costs {effective_cost} credits but you only have {current_balance}.",
                    "required": effective_cost,
                    "available": current_balance,
                    "deficit": effective_cost - current_balance,
                },
            )

        success = deduct_credits(user["user_id"], effective_cost, reason="require_credits_guard")
        if not success:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "deduction_failed",
                    "message": "Credit deduction failed due to a concurrent transaction. Please retry.",
                    "required": effective_cost,
                    "available": current_balance,
                },
            )

        return {
            "cost": effective_cost,
            "balance_before": current_balance,
            "balance_after": current_balance - effective_cost,
            "user_id": user["user_id"],
        }

    return _credit_dependency


def check_and_deduct_credits(user_id: str, preferences: dict = None, reason: str = "pipeline") -> int:
    """
    Pre-flight credit check + deduction.
    Raises HTTPException(402) if insufficient credits.

    Returns the cost that was deducted.
    """
    cost = calculate_pipeline_cost(preferences)

    current = get_user_credits(user_id)
    if current < cost:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "insufficient_credits",
                "message": f"This pipeline costs {cost} credits but you only have {current}.",
                "required": cost,
                "available": current,
                "deficit": cost - current,
            }
        )

    success = deduct_credits(user_id, cost, reason=reason)
    if not success:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "deduction_failed",
                "message": "Credit deduction failed. Please try again.",
                "required": cost,
                "available": current,
            }
        )

    return cost


def refund_credits(user_id: str, amount: int, reason: str = "pipeline_refund") -> bool:
    """
    Refund credits to a user after a pipeline failure.
    Uses Firestore transaction for safety.

    Returns True if refund succeeded.
    """
    new_balance = add_credits(user_id, amount, reason=reason)
    if new_balance >= 0:
        logger.info(f"🔄 Refunded {amount} credits to {user_id} ({reason})")
        return True
    return False


def get_credit_history(user_id: str, limit: int = 20) -> list:
    """Get recent credit transactions for a user."""
    try:
        from google.cloud.firestore_v1 import FieldFilter
        txns = (
            db.collection("credit_transactions")
            .where(filter=FieldFilter("user_id", "==", user_id))
            .order_by("created_at", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        results = []
        for doc in txns:
            data = doc.to_dict()
            data["id"] = doc.id
            results.append(data)
        return results
    except Exception as e:
        logger.error(f"❌ Failed to get credit history: {e}")
        return []
