import time
import uuid
from typing import Optional
from app.agents.triage import run_triage
from app.agents.analysis import run_analysis
from app.services.rekognition import analyze_image_s3
from app.services.vector_store import upsert_decision


async def moderate_content(
    content: str,
    user_id: str,
    platform_id: str,
    content_type: str = "text",
    context: Optional[dict] = None,
) -> dict:
    start = time.monotonic()
    decision_id = str(uuid.uuid4())

    # Image pre-screen via AWS Rekognition before any LLM call
    if content_type == "image" and context and context.get("s3_bucket"):
        image_result = analyze_image_s3(context["s3_bucket"], context.get("s3_key", content))
        if image_result.get("available") and image_result.get("flagged") and image_result["confidence"] > 0.95:
            return {
                "decision_id": decision_id,
                "action": "remove",
                "confidence": image_result["confidence"],
                "categories": image_result["categories"],
                "explanation": f"AWS Rekognition auto-flagged: {', '.join(image_result['categories'])}",
                "appeal_text": "This image was removed for violating our content policies.",
                "triage_result": "critical",
                "processing_time_ms": int((time.monotonic() - start) * 1000),
            }
        context = {**(context or {}), "image_analysis": image_result}

    triage = await run_triage(content, platform_id)

    if triage["severity"] == "safe":
        return {
            "decision_id": decision_id,
            "action": "pass",
            "confidence": 0.95,
            "categories": ["safe"],
            "explanation": triage["reason"],
            "appeal_text": "",
            "triage_result": "safe",
            "processing_time_ms": int((time.monotonic() - start) * 1000),
        }

    analysis = await run_analysis(content, triage, user_id, platform_id, context)

    result = {
        "decision_id": decision_id,
        "action": analysis["action"],
        "confidence": analysis["confidence"],
        "categories": analysis["categories"],
        "explanation": analysis["explanation"],
        "appeal_text": analysis["appeal_text"],
        "triage_result": triage["severity"],
        "processing_time_ms": int((time.monotonic() - start) * 1000),
    }

    # Store embedding for future precedent lookups — non-fatal if Pinecone unavailable
    try:
        await upsert_decision(decision_id, content, result["action"], result["categories"], platform_id)
    except Exception:
        pass

    return result
