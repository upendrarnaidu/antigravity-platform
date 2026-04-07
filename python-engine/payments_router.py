"""
Razorpay Payment Router — Production-Hardened
================================================
Endpoints:
  POST /api/payments/create-order     → Create a Razorpay checkout order
  POST /api/payments/verify-payment   → Verify client-side payment signature
  POST /api/payments/webhook          → Razorpay webhook (signature-verified)
  GET  /api/payments/status/{order_id} → Check payment status

Security:
  - Webhook signature verified via razorpay.utility.verify_webhook_signature()
  - All credit mutations happen only after cryptographic verification
  - No unverified credit top-ups are possible
  - Idempotent webhook processing (checks razorpay_payment_id before crediting)
"""

import os
import json
import hmac
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

import razorpay
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from firebase_init import db
from auth_router import get_current_user
from credit_system import add_credits

logger = logging.getLogger(__name__)

# ── Razorpay Client ──────────────────────────────────────────
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    razorpay_client = None
    logger.warning("⚠️ Razorpay credentials not set — payment endpoints will fail")

# ── Credit Pack Definitions ──────────────────────────────────
# Maps Razorpay order amounts (in paise) to credit packs
CREDIT_PACKS = {
    "credits_50":   {"credits": 50,   "price_inr": 9900,   "label": "Starter Pack"},
    "credits_200":  {"credits": 200,  "price_inr": 29900,  "label": "Pro Pack"},
    "credits_500":  {"credits": 500,  "price_inr": 49900,  "label": "Pro Subscription"},
    "credits_1000": {"credits": 1000, "price_inr": 99900,  "label": "Enterprise Pack"},
}

# Subscription plans
SUBSCRIPTION_PLANS = {
    "pro": {
        "credits_monthly": 500,
        "price_inr": 49900,
        "tier": "pro",
    },
    "enterprise": {
        "credits_monthly": 2000,
        "price_inr": 199900,
        "tier": "enterprise",
    },
}

# ── Request Models ───────────────────────────────────────────
class CreateOrderRequest(BaseModel):
    plan_id: str  # e.g. "credits_50", "credits_200", "pro", "enterprise"
    currency: str = "INR"

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

# ── Router ───────────────────────────────────────────────────
router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/create-order")
async def create_order(
    req: CreateOrderRequest,
    user: dict = Depends(get_current_user),
):
    """
    Create a Razorpay checkout order for a credit pack or subscription.
    The user_id is embedded in `notes` so the webhook can identify who paid.
    """
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured")

    plan_id = req.plan_id.lower()
    currency = req.currency.upper()

    # Resolve amount from credit packs or subscription plans
    if plan_id in CREDIT_PACKS:
        amount = CREDIT_PACKS[plan_id]["price_inr"]
        description = CREDIT_PACKS[plan_id]["label"]
        credits = CREDIT_PACKS[plan_id]["credits"]
    elif plan_id in SUBSCRIPTION_PLANS:
        amount = SUBSCRIPTION_PLANS[plan_id]["price_inr"]
        description = f"{plan_id.title()} Subscription"
        credits = SUBSCRIPTION_PLANS[plan_id]["credits_monthly"]
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan_id: {plan_id}. Options: {list(CREDIT_PACKS.keys()) + list(SUBSCRIPTION_PLANS.keys())}",
        )

    try:
        order = razorpay_client.order.create(data={
            "amount": amount,
            "currency": currency,
            "receipt": f"rcpt_{user['user_id'][:8]}_{int(datetime.now(timezone.utc).timestamp())}",
            "notes": {
                "user_id": user["user_id"],
                "email": user.get("email", ""),
                "plan_id": plan_id,
                "credits": str(credits),
            },
        })

        # Log the order in Firestore for audit trail
        db.collection("payment_orders").add({
            "user_id": user["user_id"],
            "razorpay_order_id": order["id"],
            "plan_id": plan_id,
            "amount": amount,
            "currency": currency,
            "credits": credits,
            "status": "created",
            "created_at": datetime.now(timezone.utc),
        })

        logger.info(f"💳 Order created: {order['id']} | {plan_id} | {credits} credits | User: {user['user_id']}")

        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": RAZORPAY_KEY_ID,
            "plan_id": plan_id,
            "credits": credits,
            "description": description,
        }

    except Exception as e:
        logger.error(f"❌ Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")


@router.post("/verify-payment")
async def verify_payment(
    req: VerifyPaymentRequest,
    user: dict = Depends(get_current_user),
):
    """
    Client-side payment verification (belt-and-suspenders with webhook).
    Verifies the Razorpay payment signature using the SDK.
    Does NOT credit the user — that's handled by the webhook for security.
    Just confirms the payment and updates the order status.
    """
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured")

    try:
        # Use the Razorpay SDK's built-in verification
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        logger.warning(f"⚠️ Invalid payment signature | Order: {req.razorpay_order_id} | User: {user['user_id']}")
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    # Signature valid — update order status (credits added by webhook)
    try:
        from google.cloud.firestore_v1 import FieldFilter
        orders = (
            db.collection("payment_orders")
            .where(filter=FieldFilter("razorpay_order_id", "==", req.razorpay_order_id))
            .limit(1)
            .stream()
        )
        for doc in orders:
            doc.reference.update({
                "razorpay_payment_id": req.razorpay_payment_id,
                "status": "payment_verified",
                "verified_at": datetime.now(timezone.utc),
            })
    except Exception as e:
        logger.error(f"Order status update failed: {e}")

    logger.info(f"✅ Payment verified | Order: {req.razorpay_order_id} | User: {user['user_id']}")

    return {
        "success": True,
        "message": "Payment verified. Credits will be added momentarily via webhook.",
        "order_id": req.razorpay_order_id,
        "payment_id": req.razorpay_payment_id,
    }


# ═══════════════════════════════════════════════════════════════
# WEBHOOK — Razorpay Server-to-Server (THE source of truth)
# ═══════════════════════════════════════════════════════════════

def _verify_webhook_signature(body: bytes, signature: str) -> bool:
    """
    Verify the X-Razorpay-Signature header using the webhook secret.
    Uses the razorpay SDK utility if available, falls back to manual HMAC.
    """
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.error("❌ RAZORPAY_WEBHOOK_SECRET not configured — cannot verify webhooks")
        return False

    try:
        # Preferred: use the SDK's verification utility
        if razorpay_client:
            razorpay_client.utility.verify_webhook_signature(
                body.decode("utf-8"),
                signature,
                RAZORPAY_WEBHOOK_SECRET,
            )
            return True
    except razorpay.errors.SignatureVerificationError:
        return False
    except Exception:
        pass

    # Fallback: manual HMAC-SHA256 verification
    try:
        expected = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
    except Exception:
        return False


def _is_webhook_processed(payment_id: str) -> bool:
    """
    Idempotency check: has this payment already been processed?
    Prevents double-crediting on webhook retries.
    """
    try:
        from google.cloud.firestore_v1 import FieldFilter
        existing = (
            db.collection("webhook_events")
            .where(filter=FieldFilter("razorpay_payment_id", "==", payment_id))
            .where(filter=FieldFilter("processed", "==", True))
            .limit(1)
            .stream()
        )
        for _ in existing:
            return True
        return False
    except Exception as e:
        logger.error(f"Idempotency check failed: {e}")
        return False


def _process_payment_captured(payment_entity: dict, event_id: str):
    """
    Handle payment.captured event — credit the user's wallet.
    Reads user_id and credits from the payment notes.
    """
    notes = payment_entity.get("notes", {})
    user_id = notes.get("user_id", "")
    plan_id = notes.get("plan_id", "")
    credits_str = notes.get("credits", "0")
    payment_id = payment_entity.get("id", "")
    amount = payment_entity.get("amount", 0)

    if not user_id:
        logger.error(f"❌ Webhook payment.captured missing user_id in notes | Payment: {payment_id}")
        return

    # Resolve credit amount from notes or plan lookup
    try:
        credits = int(credits_str)
    except (ValueError, TypeError):
        credits = 0

    if credits <= 0 and plan_id in CREDIT_PACKS:
        credits = CREDIT_PACKS[plan_id]["credits"]
    elif credits <= 0 and plan_id in SUBSCRIPTION_PLANS:
        credits = SUBSCRIPTION_PLANS[plan_id]["credits_monthly"]

    if credits <= 0:
        logger.error(f"❌ Cannot resolve credit amount | Plan: {plan_id} | Payment: {payment_id}")
        return

    # Idempotency: skip if already processed
    if _is_webhook_processed(payment_id):
        logger.info(f"⏭️ Webhook already processed for payment {payment_id} — skipping")
        return

    # Credit the user's wallet
    new_balance = add_credits(user_id, credits, reason=f"razorpay_{plan_id}_{payment_id}")
    if new_balance < 0:
        logger.error(f"❌ Failed to credit {credits} to user {user_id} | Payment: {payment_id}")
        return

    # Update subscription tier if it's a subscription plan
    if plan_id in SUBSCRIPTION_PLANS:
        try:
            db.collection("users").document(user_id).update({
                "tier": SUBSCRIPTION_PLANS[plan_id]["tier"],
                "subscription_status": "active",
                "updated_at": datetime.now(timezone.utc),
            })
        except Exception as e:
            logger.error(f"Tier upgrade failed: {e}")

    # Record the webhook event (idempotency marker)
    db.collection("webhook_events").add({
        "event_id": event_id,
        "event_type": "payment.captured",
        "razorpay_payment_id": payment_id,
        "razorpay_order_id": payment_entity.get("order_id", ""),
        "user_id": user_id,
        "plan_id": plan_id,
        "credits_added": credits,
        "amount_paise": amount,
        "new_balance": new_balance,
        "processed": True,
        "processed_at": datetime.now(timezone.utc),
    })

    # Update the payment order status
    try:
        from google.cloud.firestore_v1 import FieldFilter
        orders = (
            db.collection("payment_orders")
            .where(filter=FieldFilter("razorpay_order_id", "==", payment_entity.get("order_id", "")))
            .limit(1)
            .stream()
        )
        for doc in orders:
            doc.reference.update({
                "status": "captured",
                "credits_added": credits,
                "captured_at": datetime.now(timezone.utc),
            })
    except Exception as e:
        logger.error(f"Order status update failed: {e}")

    logger.info(
        f"✅ Webhook: Credited {credits} credits to {user_id} "
        f"| Plan: {plan_id} | Payment: {payment_id} | Balance: {new_balance}"
    )


def _process_subscription_charged(subscription_entity: dict, payment_entity: dict, event_id: str):
    """
    Handle subscription.charged event — recurring subscription billing.
    Credits the user's monthly allocation.
    """
    notes = subscription_entity.get("notes", {})
    user_id = notes.get("user_id", "")
    plan_id = notes.get("plan_id", "")
    payment_id = payment_entity.get("id", "")

    if not user_id or plan_id not in SUBSCRIPTION_PLANS:
        logger.error(f"❌ Webhook subscription.charged: invalid notes | User: {user_id} | Plan: {plan_id}")
        return

    # Idempotency check
    if _is_webhook_processed(payment_id):
        logger.info(f"⏭️ Subscription charge already processed for {payment_id} — skipping")
        return

    plan = SUBSCRIPTION_PLANS[plan_id]
    credits = plan["credits_monthly"]

    new_balance = add_credits(user_id, credits, reason=f"subscription_{plan_id}_{payment_id}")
    if new_balance < 0:
        logger.error(f"❌ Subscription credit failed for {user_id}")
        return

    # Update subscription status
    try:
        db.collection("users").document(user_id).update({
            "tier": plan["tier"],
            "subscription_status": "active",
            "last_charged_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })
    except Exception as e:
        logger.error(f"Subscription status update failed: {e}")

    # Record webhook event
    db.collection("webhook_events").add({
        "event_id": event_id,
        "event_type": "subscription.charged",
        "razorpay_payment_id": payment_id,
        "subscription_id": subscription_entity.get("id", ""),
        "user_id": user_id,
        "plan_id": plan_id,
        "credits_added": credits,
        "new_balance": new_balance,
        "processed": True,
        "processed_at": datetime.now(timezone.utc),
    })

    logger.info(
        f"✅ Webhook: Subscription charged — {credits} credits to {user_id} "
        f"| Plan: {plan_id} | Balance: {new_balance}"
    )


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """
    Razorpay Webhook endpoint — THE authoritative source for payment confirmations.

    Configure in Razorpay Dashboard → Webhooks:
      URL:     https://your-domain.com/api/payments/webhook
      Secret:  (set in RAZORPAY_WEBHOOK_SECRET env var)
      Events:  payment.captured, subscription.charged

    Security:
      1. Verifies X-Razorpay-Signature using HMAC-SHA256 with webhook secret
      2. Idempotent — duplicate webhook deliveries are safely ignored
      3. No authentication header required (Razorpay calls this directly)
    """
    # ── Step 1: Read raw body + signature header ─────────────
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not signature:
        logger.warning("⚠️ Webhook: Missing X-Razorpay-Signature header")
        raise HTTPException(status_code=400, detail="Missing webhook signature")

    # ── Step 2: Verify signature ─────────────────────────────
    if not _verify_webhook_signature(body, signature):
        logger.warning("🚫 Webhook: Invalid signature — request rejected")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # ── Step 3: Parse payload ────────────────────────────────
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event", "")
    event_id = payload.get("account_id", "") + "_" + str(payload.get("created_at", ""))

    logger.info(f"🔔 Webhook received: {event} | Event ID: {event_id}")

    # ── Step 4: Route to handler ─────────────────────────────
    if event == "payment.captured":
        payment_entity = (
            payload.get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )
        _process_payment_captured(payment_entity, event_id)

    elif event == "subscription.charged":
        subscription_entity = (
            payload.get("payload", {})
            .get("subscription", {})
            .get("entity", {})
        )
        payment_entity = (
            payload.get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )
        _process_subscription_charged(subscription_entity, payment_entity, event_id)

    elif event == "payment.failed":
        payment_entity = (
            payload.get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )
        logger.warning(
            f"⚠️ Webhook: Payment failed | "
            f"ID: {payment_entity.get('id', '')} | "
            f"Error: {payment_entity.get('error_description', 'unknown')}"
        )

    elif event == "subscription.cancelled":
        subscription_entity = (
            payload.get("payload", {})
            .get("subscription", {})
            .get("entity", {})
        )
        user_id = subscription_entity.get("notes", {}).get("user_id", "")
        if user_id:
            try:
                db.collection("users").document(user_id).update({
                    "subscription_status": "cancelled",
                    "tier": "free",
                    "updated_at": datetime.now(timezone.utc),
                })
                logger.info(f"🔔 Webhook: Subscription cancelled for {user_id}")
            except Exception as e:
                logger.error(f"Subscription cancellation update failed: {e}")

    else:
        logger.info(f"🔔 Webhook: Unhandled event type: {event}")

    # Always return 200 to Razorpay (prevents retries for handled events)
    return {"status": "ok", "event": event}


# ── Payment Status Check (for frontend polling) ─────────────
@router.get("/status/{order_id}")
async def get_payment_status(
    order_id: str,
    user: dict = Depends(get_current_user),
):
    """Check if a payment order has been captured and credits added."""
    try:
        from google.cloud.firestore_v1 import FieldFilter
        orders = (
            db.collection("payment_orders")
            .where(filter=FieldFilter("razorpay_order_id", "==", order_id))
            .where(filter=FieldFilter("user_id", "==", user["user_id"]))
            .limit(1)
            .stream()
        )
        for doc in orders:
            data = doc.to_dict()
            return {
                "order_id": order_id,
                "status": data.get("status", "unknown"),
                "credits_added": data.get("credits_added", 0),
                "captured_at": data.get("captured_at", None),
            }

        raise HTTPException(status_code=404, detail="Order not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment status check failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to check payment status")
