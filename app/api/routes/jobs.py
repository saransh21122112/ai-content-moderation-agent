import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.middleware.auth import get_tenant
from app.db.connection import get_session
from app.models.database import ModerationJob, Tenant
from app.models.schemas import JobStatusResponse, ModerateResponse

router = APIRouter()


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job(
    job_id: str,
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(ModerationJob).where(
            ModerationJob.id == uuid.UUID(job_id),
            ModerationJob.tenant_id == tenant.id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    moderation_result = None
    if job.result and job.status == "completed":
        moderation_result = ModerateResponse(**json.loads(job.result))

    return JobStatusResponse(
        job_id=str(job.id),
        status=job.status,
        result=moderation_result,
        created_at=job.created_at.isoformat(),
    )
