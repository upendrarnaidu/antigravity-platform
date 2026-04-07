"""
Firebase Admin SDK Initialization
=================================
Initializes firebase-admin with a service account for server-side Firestore access.
All other modules import `db` from here.
"""

import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger(__name__)

# ── Resolve service account path ──────────────────────────────
_SERVICE_ACCOUNT_PATH = os.environ.get(
    "FIREBASE_SERVICE_ACCOUNT_PATH",
    os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json")
)

# ── Initialize once ──────────────────────────────────────────
_app = None
db = None

def init_firebase():
    """Initialize Firebase Admin SDK. Safe to call multiple times."""
    global _app, db
    if _app is not None:
        return db

    try:
        if os.path.exists(_SERVICE_ACCOUNT_PATH):
            cred = credentials.Certificate(_SERVICE_ACCOUNT_PATH)
            _app = firebase_admin.initialize_app(cred)
            logger.info(f"🔥 Firebase initialized with service account: {_SERVICE_ACCOUNT_PATH}")
        else:
            # Fallback: use Application Default Credentials (for Cloud Run / GCE)
            _app = firebase_admin.initialize_app()
            logger.info("🔥 Firebase initialized with Application Default Credentials")

        db = firestore.client()
        return db

    except Exception as e:
        logger.error(f"❌ Failed to initialize Firebase: {e}")
        raise

# Auto-initialize on import
init_firebase()
