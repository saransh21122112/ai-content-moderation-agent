import asyncio
import json
import uuid
from typing import Optional

from app.workers.celery_app import celery


@celery.task(bind=True, max_retries=3, default_retry_delay=60)
def run_moderation_task(
    self,
    job_id: str,
    content: str,
    user_id: str,
    platform_id: str,
    content_type: str,
    context: dict,
    webhook_url: Optional[str] = None,
):
    async def _run():
        from app.agents.orchestrator import moderate_content
        from app.db.connection import AsyncSessionLocal
        from app.models.database import ModerationJob
        from sqlalchemy import update as sa_update

        result = await moderate_content(content, user_id, platform_id, content_type, context)

        async with AsyncSessionLocal() as session:
            await session.execute(
                sa_update(ModerationJob)
                .where(ModerationJob.id == uuid.UUID(job_id))
                .values(status="completed", result=json.dumps(result))
            )
            await session.commit()

        if webhook_url:
            from app.services.webhook import deliver_webhook
            await deliver_webhook(webhook_url, job_id, result)

    async def _fail(error_msg: str):
        from app.db.connection import AsyncSessionLocal
        from app.models.database import ModerationJob
        from sqlalchemy import update as sa_update

        async with AsyncSessionLocal() as session:
            await session.execute(
                sa_update(ModerationJob)
                .where(ModerationJob.id == uuid.UUID(job_id))
                .values(status="failed", result=json.dumps({"error": error_msg}))
            )
            await session.commit()

    try:
        asyncio.run(_run())
    except Exception as exc:
        asyncio.run(_fail(str(exc)))
        raise self.retry(exc=exc)
