import uuid
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.middleware.auth import get_tenant
from app.db.connection import get_session, AsyncSessionLocal
from app.models.database import ModerationDecision, ModerationJob, Tenant
from app.models.schemas import (
    AsyncModerateRequest, AsyncModerateResponse,
    ModerateRequest, ModerateResponse,
)
from app.agents.orchestrator import moderate_content

router = APIRouter()


@router.post("/moderate", response_model=ModerateResponse)
async def moderate(
    request: ModerateRequest,
    background_tasks: BackgroundTasks,
    tenant: Tenant = Depends(get_tenant),
    _session: AsyncSession = Depends(get_session),
):
    result = await moderate_content(
        content=request.content,
        user_id=request.user_id,
        platform_id=str(tenant.id),
        content_type=request.content_type.value,
        context=request.context,
    )

    background_tasks.add_task(
        _persist_decision,
        tenant_id=tenant.id,
        content_id=request.content_id,
        content_text=request.content[:5000],
        content_type=request.content_type.value,
        user_id=request.user_id,
        result=result,
    )

    return ModerateResponse(**result)


@router.post("/moderate/async", response_model=AsyncModerateResponse, status_code=202)
async def moderate_async(
    request: AsyncModerateRequest,
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    job_id = str(uuid.uuid4())

    job = ModerationJob(id=uuid.UUID(job_id), tenant_id=tenant.id, status="pending")
    session.add(job)
    await session.commit()

    from app.workers.tasks import run_moderation_task
    run_moderation_task.delay(
        job_id=job_id,
        content=request.content,
        user_id=request.user_id,
        platform_id=str(tenant.id),
        content_type=request.content_type.value,
        context=request.context or {},
        webhook_url=request.webhook_url,
    )

    return AsyncModerateResponse(job_id=job_id, status="pending")


async def _persist_decision(
    tenant_id, content_id, content_text, content_type, user_id, result: dict
):
    async with AsyncSessionLocal() as session:
        decision = ModerationDecision(
            id=uuid.UUID(result["decision_id"]),
            tenant_id=tenant_id,
            content_id=content_id,
            content_text=content_text,
            content_type=content_type,
            user_id=user_id,
            action=result["action"],
            confidence=result["confidence"],
            categories=result["categories"],
            explanation=result["explanation"],
            appeal_text=result["appeal_text"],
            triage_result=result["triage_result"],
            processing_time_ms=result["processing_time_ms"],
        )
        session.add(decision)
        await session.commit()
