"""
Zoho OTP Authentication Router
================================
Endpoints:
  POST /api/auth/send-otp   → Sends 6-digit OTP via Zoho SMTP
  POST /api/auth/verify-otp → Validates OTP, creates/finds user, returns JWT
"""

import os
import re
import jwt
import time
import uuid
import smtplib
import secrets
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr

from firebase_init import db
from google.cloud.firestore_v1 import FieldFilter

logger = logging.getLogger(__name__)

def _ensure_db():
    if db is None:
        raise HTTPException(
            status_code=500, 
            detail="⚠️ Critical Backend Error: The Firebase Database failed to connect. Your FIREBASE_SERVICE_ACCOUNT_JSON variable in Google Cloud Run is either missing or contains invalid JSON formatting."
        )

# ── Configuration ────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "super_secret_fallback_key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7

ZOHO_EMAIL = os.environ.get("ZOHO_EMAIL", "hello@vipunkrut.com")
ZOHO_PASSWORD = os.environ.get("ZOHO_PASSWORD", "")
ZOHO_SMTP_HOST = "smtp.zoho.com"
ZOHO_SMTP_PORT = 587

OTP_EXPIRY_MINUTES = 10
OTP_RATE_LIMIT = 5  # Max OTPs per email per 15 minutes

# ── Request / Response Models ────────────────────────────────
class SendOtpRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str

class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str
    tier: str
    message: str

# ── Security ─────────────────────────────────────────────────
security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Decode JWT from Authorization header. Raises 401 if invalid."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Router ───────────────────────────────────────────────────
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def _send_otp_email(recipient: str, code: str) -> bool:
    """
    Send OTP via Zoho SMTP.
    Returns True if sent successfully, False otherwise.
    """
    if not ZOHO_PASSWORD:
        # Development fallback: log OTP to console
        logger.warning(f"\n{'='*50}\n🔐 DEV MODE OTP for {recipient}: {code}\n{'='*50}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔐 Your login code: {code}"
        msg["From"] = f"AI Marketing OS <{ZOHO_EMAIL}>"
        msg["To"] = recipient

        # Plain text version
        text_body = f"""Your verification code is: {code}

This code expires in {OTP_EXPIRY_MINUTES} minutes.
If you didn't request this, please ignore this email.

— AI Marketing OS Team"""

        # HTML version with premium styling
        html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#0f0f1a; font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:480px; margin:40px auto; background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%); border-radius:16px; padding:40px; border:1px solid rgba(99,102,241,0.2);">
    <div style="text-align:center; margin-bottom:32px;">
      <div style="display:inline-block; background:linear-gradient(135deg,#6366f1,#a855f7); width:48px; height:48px; border-radius:12px; line-height:48px; font-size:20px;">⚡</div>
      <h1 style="color:#ffffff; font-size:22px; margin:16px 0 4px;">AI Marketing OS</h1>
      <p style="color:#94a3b8; font-size:13px; margin:0;">Verification Code</p>
    </div>
    <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); border-radius:12px; padding:24px; text-align:center; margin-bottom:24px;">
      <div style="font-size:36px; font-weight:700; letter-spacing:12px; color:#818cf8; font-family:monospace;">{code}</div>
    </div>
    <p style="color:#94a3b8; font-size:13px; text-align:center; line-height:1.6;">
      This code expires in <strong style="color:#e2e8f0;">{OTP_EXPIRY_MINUTES} minutes</strong>.<br>
      If you didn't request this, please ignore this email.
    </p>
    <hr style="border:none; border-top:1px solid rgba(255,255,255,0.06); margin:24px 0;">
    <p style="color:#475569; font-size:11px; text-align:center;">
      Sent by AI Marketing OS &bull; Powered by vipunkrut.com
    </p>
  </div>
</body>
</html>"""

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(ZOHO_SMTP_HOST, ZOHO_SMTP_PORT) as server:
            server.starttls()
            server.login(ZOHO_EMAIL, ZOHO_PASSWORD)
            server.sendmail(ZOHO_EMAIL, recipient, msg.as_string())

        logger.info(f"✅ OTP email sent to {recipient}")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to send OTP email to {recipient}: {e}")
        return False


def _check_rate_limit(email: str) -> bool:
    """Check if the email has exceeded OTP rate limit (5 per 15 min)."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)

    recent_otps = (
        db.collection("otp_codes")
        .where(filter=FieldFilter("email", "==", email))
        .where(filter=FieldFilter("created_at", ">=", cutoff))
        .stream()
    )

    count = sum(1 for _ in recent_otps)
    return count >= OTP_RATE_LIMIT


@router.post("/send-otp")
async def send_otp(req: SendOtpRequest):
    """Send a 6-digit OTP to the user's email via Zoho SMTP."""
    _ensure_db()
    email = req.email.lower().strip()

    # Basic email validation
    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Rate limiting
    if _check_rate_limit(email):
        raise HTTPException(
            status_code=429,
            detail="Too many OTP requests. Please wait 15 minutes."
        )

    # Generate OTP
    code = _generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    # Store in Firestore
    db.collection("otp_codes").add({
        "email": email,
        "code": code,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
        "used": False
    })

    # Send via Zoho SMTP
    sent = _send_otp_email(email, code)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP email")

    return {"message": "OTP sent successfully", "expires_in": OTP_EXPIRY_MINUTES * 60}


@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(req: VerifyOtpRequest):
    """Verify OTP and return a JWT session token."""
    _ensure_db()
    email = req.email.lower().strip()
    code = req.code.strip()

    if len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=400, detail="OTP must be a 6-digit number")

    # Query Firestore for matching, unexpired, unused OTP
    now = datetime.now(timezone.utc)
    otp_query = (
        db.collection("otp_codes")
        .where(filter=FieldFilter("email", "==", email))
        .where(filter=FieldFilter("code", "==", code))
        .where(filter=FieldFilter("used", "==", False))
        .order_by("created_at", direction="DESCENDING")
        .limit(1)
        .stream()
    )

    otp_doc = None
    for doc in otp_query:
        otp_data = doc.to_dict()
        if otp_data["expires_at"].replace(tzinfo=timezone.utc) > now:
            otp_doc = doc
            break

    if otp_doc is None:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP code")

    # Mark OTP as used
    otp_doc.reference.update({"used": True})

    # Clean up old OTPs for this email (async-friendly batch)
    old_otps = (
        db.collection("otp_codes")
        .where(filter=FieldFilter("email", "==", email))
        .where(filter=FieldFilter("used", "==", True))
        .stream()
    )
    for old_doc in old_otps:
        if old_doc.id != otp_doc.id:
            old_doc.reference.delete()

    # Find or create user in Firestore
    user_ref = None
    user_data = None

    users_query = (
        db.collection("users")
        .where(filter=FieldFilter("email", "==", email))
        .limit(1)
        .stream()
    )

    for doc in users_query:
        user_ref = doc.reference
        user_data = doc.to_dict()
        break

    if user_ref is None:
        # New user — create profile with free tier credits
        user_id = str(uuid.uuid4())
        user_data = {
            "email": email,
            "tier": "free",
            "subscription_status": "none",
            "token_balance": 100000,
            "credits": 20,  # Free tier: enough for 1 full Google pipeline run
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        db.collection("users").document(user_id).set(user_data)
        user_data["id"] = user_id
        logger.info(f"🆕 Created new user: {email} ({user_id})")
    else:
        user_data["id"] = user_ref.id
        user_ref.update({"updated_at": datetime.now(timezone.utc)})
        logger.info(f"🔑 Existing user logged in: {email}")

    # Generate JWT
    token_payload = {
        "user_id": user_data["id"],
        "email": email,
        "tier": user_data.get("tier", "free"),
        "subscription_status": user_data.get("subscription_status", "none"),
        "iat": int(time.time()),
        "exp": int((datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS)).timestamp()),
    }

    token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return AuthResponse(
        token=token,
        user_id=user_data["id"],
        email=email,
        tier=user_data.get("tier", "free"),
        message="Authentication successful"
    )


@router.get("/me")
async def get_profile(user: dict = Depends(get_current_user)):
    """Get the current user's profile from Firestore."""
    _ensure_db()
    user_doc = db.collection("users").document(user["user_id"]).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    data = user_doc.to_dict()
    return {
        "user_id": user["user_id"],
        "email": data.get("email"),
        "tier": data.get("tier", "free"),
        "subscription_status": data.get("subscription_status", "none"),
        "token_balance": data.get("token_balance", 0),
        "credits": data.get("credits", 0),
    }
