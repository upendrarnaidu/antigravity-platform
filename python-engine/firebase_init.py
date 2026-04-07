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
        if os.environ.get("FIREBASE_PRIVATE_KEY") and os.environ.get("FIREBASE_CLIENT_EMAIL"):
            # Construct dictionary from environment variables (Cloud Run mode)
            private_key = os.environ.get("FIREBASE_PRIVATE_KEY").replace("\\n", "\n")
            client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
            
            project_id = os.environ.get("FIREBASE_PROJECT_ID")
            if not project_id and "@" in client_email and ".iam.gserviceaccount.com" in client_email:
                project_id = client_email.split("@")[1].split(".")[0]
                
            cred_dict = {
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key,
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
            }
            
            cred = credentials.Certificate(cred_dict)
            _app = firebase_admin.initialize_app(cred)
            logger.info(f"🔥 Firebase initialized with Secrets for project: {project_id}")

        elif os.path.exists(_SERVICE_ACCOUNT_PATH):
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
