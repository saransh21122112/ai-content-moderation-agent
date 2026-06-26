import time
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from app.api.middleware.auth import get_tenant
from app.agents.orchestrator import moderate_content
from app.config import settings
from app.models.database import Tenant
from app.services.rekognition import (
    analyze_image_bytes, analyze_video_s3, upload_video_for_rekognition, is_video,
)

router = APIRouter()

IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


@router.post("/moderate/file")
async def moderate_file(
    file: UploadFile = File(...),
    user_id: str = Form(default="unknown"),
    tenant: Tenant = Depends(get_tenant),
):
    start = time.time()
    file_bytes = await file.read()
    filename = file.filename or "upload"

    if is_video(filename):
        if not settings.aws_access_key_id:
            raise HTTPException(status_code=400, detail="AWS credentials not configured")
        if not settings.aws_s3_upload_bucket:
            raise HTTPException(
                status_code=400,
                detail="Set AWS_S3_UPLOAD_BUCKET in .env to enable video scanning",
            )
        # Upload to a eu-west-1 bucket (auto-created) so Rekognition Video API can access it
        bucket, key = upload_video_for_rekognition(file_bytes, filename)
        rek = analyze_video_s3(bucket, key)
        content_type = "video"

    else:
        # Images: send bytes directly — no S3 needed
        rek = analyze_image_bytes(file_bytes)
        content_type = "image"

    elapsed = int((time.time() - start) * 1000)

    # Auto-remove if Rekognition is highly confident
    if rek.get("available") and rek.get("flagged") and rek["confidence"] > 0.95:
        return {
            "action": "remove",
            "confidence": round(rek["confidence"], 3),
            "categories": rek["categories"],
            "explanation": (
                f"Auto-removed by Rekognition: detected {', '.join(rek['categories'])} "
                f"at {rek['confidence'] * 100:.0f}% confidence."
            ),
            "triage_result": "critical",
            "rekognition": rek,
            "requires_human_review": False,
            "processing_time_ms": elapsed,
            "filename": filename,
        }

    # Run through AI pipeline with Rekognition context injected
    result = await moderate_content(
        content=filename,
        user_id=user_id,
        platform_id=str(tenant.id),
        content_type=content_type,
        context={"rekognition": str(rek), "filename": filename},
    )
    result["rekognition"] = rek
    result["filename"] = filename
    return result
