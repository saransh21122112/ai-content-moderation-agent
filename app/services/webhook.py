import hashlib
import hmac
import json
import time
from typing import Optional

import httpx


async def deliver_webhook(url: str, job_id: str, result: dict, secret: Optional[str] = None):
    payload = {
        "job_id": job_id,
        "timestamp": int(time.time()),
        "event": "moderation.completed",
        "data": result,
    }
    payload_str = json.dumps(payload, sort_keys=True)
    headers = {"Content-Type": "application/json"}

    if secret:
        sig = hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
        headers["X-Webhook-Signature"] = f"sha256={sig}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            await client.post(url, content=payload_str, headers=headers)
        except Exception:
            pass
