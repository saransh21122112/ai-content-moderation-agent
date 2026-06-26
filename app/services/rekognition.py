import os
from app.config import settings

VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.wmv', '.webm', '.mkv', '.flv', '.m4v'}


def is_video(filename: str) -> bool:
    return os.path.splitext(filename.lower())[1] in VIDEO_EXTENSIONS


def _rek_client():
    import boto3
    return boto3.client(
        "rekognition",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def _s3_client():
    import boto3
    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def analyze_image_bytes(image_bytes: bytes) -> dict:
    """Scan an image directly from bytes — no S3 coupling."""
    if not settings.aws_access_key_id:
        return {"flagged": False, "categories": [], "confidence": 0.0, "available": False}
    try:
        response = _rek_client().detect_moderation_labels(
            Image={"Bytes": image_bytes},
            MinConfidence=60,
        )
        labels = response.get("ModerationLabels", [])
        categories = [l["Name"] for l in labels]
        max_conf = max((l["Confidence"] / 100 for l in labels), default=0.0)
        return {"flagged": bool(labels), "categories": categories, "confidence": max_conf, "available": True}
    except Exception as e:
        return {"flagged": False, "categories": [], "confidence": 0.0, "available": False, "error": str(e)}


def analyze_image_s3(bucket: str, key: str) -> dict:
    """Download from S3 then scan bytes — works cross-region."""
    if not settings.aws_access_key_id:
        return {"flagged": False, "categories": [], "confidence": 0.0, "available": False}
    try:
        obj = _s3_client().get_object(Bucket=bucket, Key=key)
        image_bytes = obj["Body"].read()
        return analyze_image_bytes(image_bytes)
    except Exception as e:
        return {"flagged": False, "categories": [], "confidence": 0.0, "available": False, "error": str(e)}


# Rekognition Video API requires bucket and service in the same supported region.
# eu-north-1 (Stockholm) does NOT support Rekognition, so we use eu-west-1 (Ireland).
VIDEO_REKOGNITION_REGION = "eu-west-1"


def _ensure_video_bucket(bucket: str) -> None:
    """Create the video upload bucket in VIDEO_REKOGNITION_REGION if it doesn't exist."""
    import boto3
    s3 = boto3.client(
        "s3",
        region_name=VIDEO_REKOGNITION_REGION,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    try:
        s3.head_bucket(Bucket=bucket)
    except Exception:
        s3.create_bucket(
            Bucket=bucket,
            CreateBucketConfiguration={"LocationConstraint": VIDEO_REKOGNITION_REGION},
        )


def upload_video_for_rekognition(file_bytes: bytes, filename: str) -> tuple[str, str]:
    """Upload video bytes to a Rekognition-compatible bucket in eu-west-1.
    Returns (bucket, key)."""
    import uuid, boto3
    video_bucket = settings.aws_s3_upload_bucket + "-rek-video"
    _ensure_video_bucket(video_bucket)

    s3 = boto3.client(
        "s3",
        region_name=VIDEO_REKOGNITION_REGION,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    key = f"moderation-uploads/{uuid.uuid4()}/{filename}"
    s3.put_object(Bucket=video_bucket, Key=key, Body=file_bytes)
    return video_bucket, key


def upload_to_s3(file_bytes: bytes, filename: str, bucket: str) -> str:
    """Upload bytes to S3 under a unique key, return the key."""
    import uuid
    key = f"moderation-uploads/{uuid.uuid4()}/{filename}"
    _s3_client().put_object(Bucket=bucket, Key=key, Body=file_bytes)
    return key


def analyze_video_s3(bucket: str, key: str) -> dict:
    """Start Rekognition video job and poll until complete (max 90s).
    Bucket must be in VIDEO_REKOGNITION_REGION."""
    if not settings.aws_access_key_id:
        return {"flagged": False, "categories": [], "confidence": 0.0, "available": False}
    try:
        import time, boto3
        client = boto3.client(
            "rekognition",
            region_name=VIDEO_REKOGNITION_REGION,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )

        start = client.start_content_moderation(
            Video={"S3Object": {"Bucket": bucket, "Name": key}},
            MinConfidence=60,
        )
        job_id = start["JobId"]

        for _ in range(45):  # poll up to 90 seconds
            time.sleep(2)
            result = client.get_content_moderation(JobId=job_id, SortBy="TIMESTAMP")
            status = result["JobStatus"]
            if status == "SUCCEEDED":
                labels = result.get("ModerationLabels", [])
                categories = list({l["ModerationLabel"]["Name"] for l in labels})
                max_conf = max(
                    (l["ModerationLabel"]["Confidence"] / 100 for l in labels), default=0.0
                )
                return {
                    "flagged": bool(labels),
                    "categories": categories,
                    "confidence": max_conf,
                    "available": True,
                    "label_count": len(labels),
                }
            elif status == "FAILED":
                return {"flagged": False, "categories": [], "confidence": 0.0,
                        "available": False, "error": "Rekognition video job failed"}

        return {"flagged": False, "categories": [], "confidence": 0.0,
                "available": False, "error": "Video analysis timed out after 90s"}
    except Exception as e:
        return {"flagged": False, "categories": [], "confidence": 0.0, "available": False, "error": str(e)}
