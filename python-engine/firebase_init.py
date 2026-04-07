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
        if os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
            import json
            cert_dict = json.loads(os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"))
            cred = credentials.Certificate(cert_dict)
            _app = firebase_admin.initialize_app(cred)
            logger.info("🔥 Firebase initialized with full JSON secret")
            
        elif os.environ.get("FIREBASE_PRIVATE_KEY") and os.environ.get("FIREBASE_CLIENT_EMAIL"):
            # Construct dictionary from environment variables (Cloud Run mode)
            raw_key = os.environ.get("FIREBASE_PRIVATE_KEY")
            # If Google Cloud Run escaped the newlines, unescape them
            private_key = raw_key.replace("\\n", "\n")
            
            # If Google Cloud Run replaced newlines with spaces (very common in secret managers)
            if "-----BEGIN PRIVATE KEY----- " in private_key:
                private_key = private_key.replace("-----BEGIN PRIVATE KEY----- ", "-----BEGIN PRIVATE KEY-----\n")
                private_key = private_key.replace(" -----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----")
                # Any remaining spaces inside the middle block need to be newlines
                middle = private_key.split("-----BEGIN PRIVATE KEY-----\n")[1].split("\n-----END PRIVATE KEY-----")[0]
                middle_fixed = middle.replace(" ", "\n")
                private_key = f"-----BEGIN PRIVATE KEY-----\n{middle_fixed}\n-----END PRIVATE KEY-----\n"

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
        # We do not re-raise the exception here. 
        # Crashing here prevents the Cloud Run container from starting and binding to its PORT.
        # It's better to let the server start and fail gracefully on specific API calls.

# Auto-initialize on import
init_firebase()
