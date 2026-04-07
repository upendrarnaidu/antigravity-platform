"""
FastAPI Application Server
============================
Mounts auth and payment routers.
Runs on port 8000 alongside the Kafka consumer.
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth_router import router as auth_router
from payments_router import router as payments_router
from workflow_router import router as workflow_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 FastAPI server starting...")
    logger.info("🔥 Firebase Firestore connected")
    logger.info("📧 Zoho SMTP configured")
    logger.info("💳 Razorpay client initialized")
    yield
    logger.info("👋 FastAPI server shutting down...")


# ── Create App ───────────────────────────────────────────────
app = FastAPI(
    title="AI Marketing Platform API",
    description="Authentication, Payments, Multi-Modal Director Pipeline",
    version="3.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:5173",    # Vite dev
    "http://localhost:3000",    # Node API (proxy)
    "https://saas-product-a8757.web.app",
    "https://saas-product-a8757.firebaseapp.com",
    "https://antigravity-platform.vercel.app",
    "https://vipunkrut.com",
    "https://www.vipunkrut.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Routers ────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(payments_router)
app.include_router(workflow_router)


# ── Health Check ─────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "python-api",
        "version": "3.0.0",
    }


@app.get("/")
async def root():
    return {
        "message": "AI Marketing Platform — Python API",
        "docs": "/docs",
        "health": "/health",
    }


# ── Run Server ───────────────────────────────────────────────
def start_api_server():
    """Start the FastAPI server. Called from main.py in a separate thread."""
    import uvicorn
    port = int(os.environ.get("PYTHON_API_PORT", 8000))
    logger.info(f"🌐 Starting FastAPI on port {port}")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True,
    )


if __name__ == "__main__":
    start_api_server()
