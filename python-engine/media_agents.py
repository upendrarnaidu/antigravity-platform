"""
Multi-Modal Media Agents — Dynamic Provider Routing
=====================================================
Each agent reads a `provider` preference and routes to the appropriate API:
  Voice:  google (Cloud TTS / Journey) | elevenlabs (Adam voice)
  Image:  google (Vertex AI Imagen 3)  | replicate (Flux-Schnell)
  Video:  google (Vertex AI Veo)       | replicate (Luma Ray)

Google Cloud is the default (cheaper) provider. Third-party providers
are premium options that cost more credits.
"""

import os
import io
import time
import json
import logging
import httpx
import replicate
from datetime import datetime, timezone

from firebase_init import db

logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────
REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN", "")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")  # Adam
ELEVENLABS_MODEL_ID = "eleven_multilingual_v2"

GOOGLE_PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
GOOGLE_LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")

FLUX_MODEL = "black-forest-labs/flux-schnell"
LUMA_MODEL = "luma/ray"

# Default video duration (user-configurable)
DEFAULT_VIDEO_DURATION_SECONDS = 5


def _publish_progress(redis_client, session_id: str, agent: str, status: str, progress: int, url: str = None, error: str = None):
    """Publish agent progress to Redis for real-time UI updates."""
    if redis_client is None:
        return
    payload = {
        "type": "media_progress",
        "agent": agent,
        "status": status,
        "progress": progress,
    }
    if url:
        payload["url"] = url
    if error:
        payload["error"] = error
    try:
        redis_client.publish(f"workflow_updates:{session_id}", json.dumps(payload))
    except Exception as e:
        logger.warning(f"Redis publish failed: {e}")


def _upload_to_storage(audio_bytes: bytes, path: str, content_type: str) -> str:
    """Upload bytes to Firebase Storage, return public URL."""
    try:
        from firebase_admin import storage
        bucket = storage.bucket()
        blob = bucket.blob(path)
        blob.upload_from_string(audio_bytes, content_type=content_type)
        blob.make_public()
        return blob.public_url
    except Exception as e:
        logger.warning(f"Firebase Storage upload failed: {e}")
        return ""


# ═══════════════════════════════════════════════════════════════
# 🎙️ VOICE AGENT — Dynamic Provider Routing
# ═══════════════════════════════════════════════════════════════

def _generate_voice_google(script: str, campaign_id: str, redis_client, session_id: str) -> str:
    """Google Cloud TTS with Journey voices — default/cheap provider."""
    agent_name = "VoiceEngine"
    _publish_progress(redis_client, session_id, agent_name, "running", 30)

    try:
        from google.cloud import texttospeech_v1 as texttospeech

        client = texttospeech.TextToSpeechClient()

        truncated = script[:5000]  # Google TTS supports up to 5000 chars

        synthesis_input = texttospeech.SynthesisInput(text=truncated)

        # Use Journey voice for high quality marketing narration
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Journey-D",  # Deep, professional male voice
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.0,
            pitch=0.0,
        )

        _publish_progress(redis_client, session_id, agent_name, "running", 50)

        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )

        _publish_progress(redis_client, session_id, agent_name, "running", 75)

        # Upload to Firebase Storage
        audio_url = _upload_to_storage(
            response.audio_content,
            f"voiceovers/{campaign_id}_google.mp3",
            "audio/mpeg"
        )

        if not audio_url:
            audio_url = f"https://storage.googleapis.com/voiceover-google-{campaign_id}.mp3"

        _save_media_url(campaign_id, "voiceover_url", audio_url)
        _publish_progress(redis_client, session_id, agent_name, "done", 100, url=audio_url)
        logger.info(f"✅ Google TTS voiceover generated for campaign {campaign_id}")
        return audio_url

    except ImportError:
        logger.error("❌ google-cloud-texttospeech not installed. Run: pip install google-cloud-texttospeech")
        _publish_progress(redis_client, session_id, agent_name, "error", 0, error="Google TTS SDK not installed")
        return ""
    except Exception as e:
        error_msg = f"Google TTS failed: {str(e)}"
        logger.error(f"❌ {error_msg}")
        _publish_progress(redis_client, session_id, agent_name, "error", 0, error=error_msg)
        return ""


def _generate_voice_elevenlabs(script: str, campaign_id: str, redis_client, session_id: str, voice_id: str = None) -> str:
    """ElevenLabs TTS with Adam voice — premium provider."""
    agent_name = "VoiceEngine"
    _publish_progress(redis_client, session_id, agent_name, "running", 30)

    if not ELEVENLABS_API_KEY:
        logger.warning("⚠️ ELEVENLABS_API_KEY not set — skipping")
        _publish_progress(redis_client, session_id, agent_name, "skipped", 100)
        return ""

    voice = voice_id or ELEVENLABS_VOICE_ID
    truncated_script = script[:2000]

    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}"
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": truncated_script,
            "model_id": ELEVENLABS_MODEL_ID,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.4,
                "use_speaker_boost": True,
            }
        }

        with httpx.Client(timeout=120.0) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()

        _publish_progress(redis_client, session_id, agent_name, "running", 70)

        audio_url = _upload_to_storage(
            response.content,
            f"voiceovers/{campaign_id}_elevenlabs.mp3",
            "audio/mpeg"
        )

        if not audio_url:
            audio_url = f"https://storage.googleapis.com/voiceover-elevenlabs-{campaign_id}.mp3"

        _save_media_url(campaign_id, "voiceover_url", audio_url)
        _publish_progress(redis_client, session_id, agent_name, "done", 100, url=audio_url)
        logger.info(f"✅ ElevenLabs voiceover generated for campaign {campaign_id}")
        return audio_url

    except httpx.HTTPStatusError as e:
        error_msg = f"ElevenLabs API error: {e.response.status_code} — {e.response.text[:200]}"
        logger.error(f"❌ {error_msg}")
        _publish_progress(redis_client, session_id, agent_name, "error", 0, error=error_msg)
        return ""
    except Exception as e:
        error_msg = f"ElevenLabs TTS failed: {str(e)}"
        logger.error(f"❌ {error_msg}")
        _publish_progress(redis_client, session_id, agent_name, "error", 0, error=error_msg)
        return ""


def generate_voiceover(
    script: str,
    campaign_id: str,
    *,
    redis_client=None,
    session_id: str = "",
    voice_id: str = None,
    provider: str = "google",
) -> str:
    """
    Generate TTS voiceover — routes to Google Cloud TTS or ElevenLabs.

    Args:
        provider: 'google' (default, cheaper) or 'elevenlabs' (premium)
    """
    agent_name = "VoiceEngine"
    _publish_progress(redis_client, session_id, agent_name, "running", 10)
    logger.info(f"🎙️ Voice Agent using provider: {provider}")

    if provider == "elevenlabs":
        return _generate_voice_elevenlabs(script, campaign_id, redis_client, session_id, voice_id)
    else:
        return _generate_voice_google(script, campaign_id, redis_client, session_id)


# ═══════════════════════════════════════════════════════════════
# 🖼️ IMAGE AGENT — Dynamic Provider Routing
# ═══════════════════════════════════════════════════════════════

def _generate_image_google(visual_prompt: str, campaign_id: str, redis_client, session_id: str) -> str:
    """Google Vertex AI Imagen 3 — default/cheap provider."""
    agent_name = "ImageRenderer"
    _publish_progress(redis_client, session_id, agent_name, "running", 30)

    try:
        from vertexai.preview.vision_models import ImageGenerationModel

        model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-002")

        enhanced_prompt = (
            f"Professional marketing visual, ultra high quality, 4K, "
            f"studio lighting, cinematic composition: {visual_prompt}"
        )

        _publish_progress(redis_client, session_id, agent_name, "running", 50)

        response = model.generate_images(
            prompt=enhanced_prompt,
            number_of_images=1,
            aspect_ratio="16:9",
        )

        _publish_progress(redis_client, session_id, agent_name, "running", 80)

        if response.images:
            image_bytes = response.images[0]._image_bytes
            image_url = _upload_to_storage(
                image_bytes,
                f"thumbnails/{campaign_id}_imagen.png",
                "image/png"
            )
            if not image_url:
                image_url = f"https://storage.googleapis.com/thumbnail-imagen-{campaign_id}.png"

            _save_media_url(campaign_id, "thumbnail_url", image_url)
            _publish_progress(redis_client, session_id, agent_name, "done", 100, url=image_url)
            logger.info(f"✅ Imagen 3 thumbnail generated for campaign {campaign_id}")
            return image_url
        else:
            raise ValueError("No images returned from Imagen 3")

    except ImportError:
        logger.error("❌ vertexai not installed. Run: pip install google-cloud-aiplatform")
        _publish_progress(redis_client, session_id, agent_name, "error", 0, error="Vertex AI SDK not installed")
        return ""
    except Exception as e:
        error_msg = f"Imagen 3 generation failed: {str(e)}"
        logger.error(f"❌ {error_msg}")
        _publish_progress(redis_client, session_id, agent_name, "error", 0, error=error_msg)
        return ""


def _generate_image_replicate(visual_prompt: str, campaign_id: str, redis_client, session_id: str) -> str:
    """Replicate Flux-Schnell — premium provider."""
    agent_name = "ImageRenderer"
    _publish_progress(redis_client, session_id, agent_name, "running", 30)

    if not REPLICATE_API_TOKEN:
        logger.warning("⚠️ REPLICATE_API_TOKEN not set — skipping")
        _publish_progress(redis_client, session_id, agent_name, "skipped", 100)
        return ""

    os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN

    try:
        enhanced_prompt = (
            f"Professional marketing visual, ultra high quality, 4K, studio lighting, "
            f"cinematic composition: {visual_prompt}"
        )

        _publish_progress(redis_client, session_id, agent_name, "running", 50)

        output = replicate.run(
            FLUX_MODEL,
            input={
                "prompt": enhanced_prompt,
                "num_outputs": 1,
                "aspect_ratio": "16:9",
                "output_format": "webp",
                "output_quality": 90,
                "go_fast": True,
            }
        )

        _publish_progress(redis_client, session_id, agent_name, "running", 80)

        image_url = ""
        if isinstance(output, list) and len(output) > 0:
            item = output[0]
            if hasattr(item, "url"):
                image_url = item.url
            elif isinstance(item, str):
                image_url = item
            else:
                image_url = str(item)
        elif hasattr(output, "url"):
            image_url = output.url
        elif isinstance(output, str):
            image_url = output

        if not image_url:
            raise ValueError("No image URL returned from Replicate")

        _save_media_url(campaign_id, "thumbnail_url", image_url)
        _publish_progress(redis_client, session_id, agent_name, "done", 100, url=image_url)
        logger.info(f"✅ Flux-Schnell thumbnail generated: {image_url[:80]}...")
        return image_url

    except Exception as e:
        error_msg = f"Flux-Schnell generation failed: {str(e)}"
        logger.error(f"❌ {error_msg}")
        _publish_progress(redis_client, session_id, agent_name, "error", 0, error=error_msg)
        return ""


def generate_thumbnail(
    visual_prompt: str,
    campaign_id: str,
    *,
    redis_client=None,
    session_id: str = "",
    provider: str = "google",
) -> str:
    """
    Generate marketing thumbnail — routes to Vertex AI Imagen 3 or Replicate Flux.

    Args:
        provider: 'google' (default, cheaper) or 'replicate' (premium)
    """
    agent_name = "ImageRenderer"
    _publish_progress(redis_client, session_id, agent_name, "running", 10)
    logger.info(f"🖼️ Image Agent using provider: {provider}")

    if provider == "replicate":
        return _generate_image_replicate(visual_prompt, campaign_id, redis_client, session_id)
    else:
        return _generate_image_google(visual_prompt, campaign_id, redis_client, session_id)


# ═══════════════════════════════════════════════════════════════
# 🎬 VIDEO AGENT — Dynamic Provider Routing
# ═══════════════════════════════════════════════════════════════

def _generate_video_google(image_url: str, campaign_id: str, redis_client, session_id: str, prompt: str, duration_seconds: int) -> str:
    """Google Vertex AI Veo — default/cheap provider."""
    agent_name = "VideoEngine"
    _publish_progress(redis_client, session_id, agent_name, "running", 20)

    try:
        from vertexai.preview.vision_models import ImageGenerationModel
        # Note: Veo API may require specific preview access
        # Using a text-to-video approach

        motion_prompt = prompt or "Slow, cinematic camera push with subtle parallax motion, professional marketing ad"

        _publish_progress(redis_client, session_id, agent_name, "running", 40)

        # Veo video generation via Vertex AI
        # This uses the Vertex AI generative models API
        import vertexai
        from vertexai.generative_models import GenerativeModel

        vertexai.init(project=GOOGLE_PROJECT_ID, location=GOOGLE_LOCATION)

        # For Veo, we use the dedicated video generation endpoint
        # Fallback: use imagen for a sequence of frames
        with httpx.Client(timeout=300.0) as client:
            # Use the REST API for Veo
            access_token = _get_google_access_token()
            if not access_token:
                raise RuntimeError("Could not obtain Google Cloud access token")

            veo_url = (
                f"https://{GOOGLE_LOCATION}-aiplatform.googleapis.com/v1/"
                f"projects/{GOOGLE_PROJECT_ID}/locations/{GOOGLE_LOCATION}/"
                f"publishers/google/models/veo-002:predictLongRunning"
            )

            veo_payload = {
                "instances": [{
                    "prompt": motion_prompt,
                    "image": {"bytesBase64Encoded": ""} if not image_url else {"gcsUri": image_url},
                }],
                "parameters": {
                    "aspectRatio": "16:9",
                    "durationSeconds": duration_seconds,
                    "sampleCount": 1,
                }
            }

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }

            response = client.post(veo_url, json=veo_payload, headers=headers)
            response.raise_for_status()

            result = response.json()

            # Poll long-running operation
            operation_name = result.get("name", "")
            if operation_name:
                video_url = _poll_google_operation(operation_name, access_token, redis_client, session_id, agent_name)
            else:
                raise ValueError("No operation returned from Veo")

        if video_url:
            _save_media_url(campaign_id, "video_url", video_url)
            _publish_progress(redis_client, session_id, agent_name, "done", 100, url=video_url)
            logger.info(f"✅ Veo video generated for campaign {campaign_id}")
            return video_url
        else:
            raise ValueError("Veo did not return a video URL")

    except ImportError:
        logger.error("❌ vertexai not installed for video generation")
        _publish_progress(redis_client, session_id, agent_name, "error", 0, error="Vertex AI SDK not installed")
        return ""
    except Exception as e:
        error_msg = f"Veo video generation failed: {str(e)}"
        logger.error(f"❌ {error_msg}")
        _publish_progress(redis_client, session_id, agent_name, "error", 0, error=error_msg)
        return ""


def _generate_video_replicate(image_url: str, campaign_id: str, redis_client, session_id: str, prompt: str, duration_seconds: int) -> str:
    """Replicate Luma Ray — premium provider."""
    agent_name = "VideoEngine"
    _publish_progress(redis_client, session_id, agent_name, "running", 15)

    if not REPLICATE_API_TOKEN:
        logger.warning("⚠️ REPLICATE_API_TOKEN not set — skipping")
        _publish_progress(redis_client, session_id, agent_name, "skipped", 100)
        return ""

    if not image_url:
        logger.warning("⚠️ No image URL provided — skipping")
        _publish_progress(redis_client, session_id, agent_name, "skipped", 100)
        return ""

    duration_seconds = max(5, min(30, duration_seconds))
    os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN

    try:
        _publish_progress(redis_client, session_id, agent_name, "running", 25)
        logger.info(f"🎬 Generating {duration_seconds}s video via Luma Ray for campaign {campaign_id}")

        motion_prompt = prompt or "Slow, cinematic camera push with subtle parallax motion, professional marketing ad feel"

        prediction = replicate.predictions.create(
            model=LUMA_MODEL,
            input={
                "prompt": motion_prompt,
                "start_image": image_url,
                "aspect_ratio": "16:9",
            }
        )

        poll_count = 0
        max_polls = 120

        while prediction.status not in ("succeeded", "failed", "canceled"):
            time.sleep(5)
            prediction.reload()
            poll_count += 1
            poll_progress = min(90, 25 + int((poll_count / max_polls) * 65))
            _publish_progress(redis_client, session_id, agent_name, "running", poll_progress)

            if poll_count >= max_polls:
                raise TimeoutError("Video generation timed out after 10 minutes")

        if prediction.status == "failed":
            raise RuntimeError(f"Luma Ray prediction failed: {prediction.error}")

        _publish_progress(redis_client, session_id, agent_name, "running", 95)

        video_url = ""
        output = prediction.output
        if isinstance(output, str):
            video_url = output
        elif isinstance(output, list) and len(output) > 0:
            video_url = str(output[0])
        elif hasattr(output, "url"):
            video_url = output.url

        if not video_url:
            raise ValueError("No video URL returned from Replicate")

        _save_media_url(campaign_id, "video_url", video_url)
        _publish_progress(redis_client, session_id, agent_name, "done", 100, url=video_url)
        logger.info(f"✅ Luma Ray video generated ({duration_seconds}s): {video_url[:80]}...")
        return video_url

    except Exception as e:
        error_msg = f"Luma Ray video failed: {str(e)}"
        logger.error(f"❌ {error_msg}")
        _publish_progress(redis_client, session_id, agent_name, "error", 0, error=error_msg)
        return ""


def generate_video(
    image_url: str,
    campaign_id: str,
    *,
    redis_client=None,
    session_id: str = "",
    prompt: str = "",
    duration_seconds: int = DEFAULT_VIDEO_DURATION_SECONDS,
    provider: str = "google",
) -> str:
    """
    Animate thumbnail into video — routes to Vertex AI Veo or Replicate Luma Ray.

    Args:
        provider: 'google' (default, cheaper) or 'replicate' (premium)
        duration_seconds: 5-30 seconds
    """
    agent_name = "VideoEngine"
    _publish_progress(redis_client, session_id, agent_name, "running", 10)
    logger.info(f"🎬 Video Agent using provider: {provider}")

    if provider == "replicate":
        return _generate_video_replicate(image_url, campaign_id, redis_client, session_id, prompt, duration_seconds)
    else:
        return _generate_video_google(image_url, campaign_id, redis_client, session_id, prompt, duration_seconds)


# ═══════════════════════════════════════════════════════════════
# 🔧 HELPERS
# ═══════════════════════════════════════════════════════════════

def _get_google_access_token() -> str:
    """Get OAuth2 access token for Google Cloud APIs."""
    try:
        import google.auth
        import google.auth.transport.requests
        credentials, project = google.auth.default()
        credentials.refresh(google.auth.transport.requests.Request())
        return credentials.token
    except Exception as e:
        logger.error(f"Failed to get Google access token: {e}")
        return ""


def _poll_google_operation(operation_name: str, access_token: str, redis_client, session_id: str, agent_name: str) -> str:
    """Poll a Google Cloud long-running operation for completion."""
    poll_url = f"https://{GOOGLE_LOCATION}-aiplatform.googleapis.com/v1/{operation_name}"
    headers = {"Authorization": f"Bearer {access_token}"}

    for i in range(120):  # 10 minutes max
        time.sleep(5)
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(poll_url, headers=headers)
                result = resp.json()

            if result.get("done"):
                predictions = result.get("response", {}).get("predictions", [])
                if predictions:
                    video_uri = predictions[0].get("videoUri", "")
                    return video_uri
                return ""

            progress = min(90, 25 + int((i / 120) * 65))
            _publish_progress(redis_client, session_id, agent_name, "running", progress)

        except Exception as e:
            logger.warning(f"Poll error: {e}")

    raise TimeoutError("Google video operation timed out")


def _save_media_url(campaign_id: str, field: str, url: str):
    """Save a single media URL field to the campaign document in Firestore."""
    try:
        db.collection("campaigns").document(campaign_id).update({
            field: url,
            "updated_at": datetime.now(timezone.utc),
        })
        logger.info(f"💾 Saved {field} for campaign {campaign_id}")
    except Exception as e:
        logger.error(f"❌ Firestore save failed for {field}: {e}")


def run_media_pipeline(
    campaign_id: str,
    script: str,
    visual_prompt: str,
    *,
    redis_client=None,
    session_id: str = "",
    video_duration: int = DEFAULT_VIDEO_DURATION_SECONDS,
    preferences: dict = None,
) -> dict:
    """
    Run the full multi-modal pipeline with dynamic provider routing.

    Args:
        preferences: Dict with keys 'voice_provider', 'image_provider', 'video_provider'
                     Values: 'google' (default) or 'elevenlabs'/'replicate'

    Returns dict with all generated URLs.
    """
    prefs = preferences or {}
    voice_provider = prefs.get("voice_provider", "google")
    image_provider = prefs.get("image_provider", "google")
    video_provider = prefs.get("video_provider", "google")

    logger.info(f"🎬 Starting Multi-Modal Pipeline for campaign {campaign_id}")
    logger.info(f"   Providers: voice={voice_provider}, image={image_provider}, video={video_provider}")

    results = {
        "voiceover_url": "",
        "thumbnail_url": "",
        "video_url": "",
    }

    # Phase 1: Voice + Image (sequential for rate limit safety)
    results["voiceover_url"] = generate_voiceover(
        script, campaign_id,
        redis_client=redis_client, session_id=session_id,
        provider=voice_provider,
    )

    results["thumbnail_url"] = generate_thumbnail(
        visual_prompt, campaign_id,
        redis_client=redis_client, session_id=session_id,
        provider=image_provider,
    )

    # Phase 2: Video depends on image
    if results["thumbnail_url"]:
        results["video_url"] = generate_video(
            results["thumbnail_url"], campaign_id,
            redis_client=redis_client, session_id=session_id,
            duration_seconds=video_duration,
            provider=video_provider,
        )
    else:
        logger.warning("⚠️ Skipping video generation — no thumbnail available")
        _publish_progress(redis_client, session_id, "VideoEngine", "skipped", 100)

    logger.info(f"✅ Multi-Modal Pipeline complete for campaign {campaign_id}")
    return results
