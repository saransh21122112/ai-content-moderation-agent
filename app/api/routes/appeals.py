import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.middleware.auth import get_tenant
from app.db.connection import get_session
from app.models.database import Appeal, ModerationDecision, Tenant
from app.models.schemas import AppealCreateRequest, AppealItem, AppealResolveRequest

router = APIRouter()


@router.post("/appeals", status_code=201)
async def create_appeal(
    request: AppealCreateRequest,
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(ModerationDecision).where(
            ModerationDecision.id == uuid.UUID(request.decision_id),
            ModerationDecision.tenant_id == tenant.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Decision not found")

    appeal = Appeal(
        decision_id=uuid.UUID(request.decision_id),
        appeal_reason=request.appeal_reason,
        status="pending",
    )
    session.add(appeal)
    await session.commit()
    return {"appeal_id": str(appeal.id), "status": "pending"}


@router.get("/appeals")
async def list_appeals(
    status: str = None,
    page: int = 1,
    limit: int = 20,
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    query = (
        select(Appeal, ModerationDecision)
        .join(ModerationDecision, Appeal.decision_id == ModerationDecision.id)
        .where(ModerationDecision.tenant_id == tenant.id)
    )
    if status:
        query = query.where(Appeal.status == status)

    result = await session.execute(
        query.order_by(Appeal.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    rows = result.all()

    items = [
        AppealItem(
            appeal_id=str(appeal.id),
            decision_id=str(appeal.decision_id),
            appeal_reason=appeal.appeal_reason or "",
            status=appeal.status,
            created_at=appeal.created_at.isoformat(),
            resolved_at=appeal.resolved_at.isoformat() if appeal.resolved_at else None,
            content_preview=decision.content_text[:200] if decision.content_text else None,
            original_action=decision.action,
        )
        for appeal, decision in rows
    ]
    return {"items": items, "total": len(items), "page": page}


@router.post("/appeals/{appeal_id}/reanalyze")
async def reanalyze_appeal(
    appeal_id: str,
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Appeal, ModerationDecision)
        .join(ModerationDecision, Appeal.decision_id == ModerationDecision.id)
        .where(Appeal.id == uuid.UUID(appeal_id), ModerationDecision.tenant_id == tenant.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Appeal not found")

    appeal, decision = row
    if not decision.content_text:
        raise HTTPException(status_code=400, detail="Original content not available for re-analysis")

    from app.agents.appeal import reanalyze_for_appeal
    suggestion = await reanalyze_for_appeal(
        content=decision.content_text,
        original_action=decision.action,
        appeal_reason=appeal.appeal_reason or "",
        user_id=decision.user_id or "unknown",
        platform_id=str(tenant.id),
        original_categories=decision.categories or [],
    )

    return {
        "appeal_id": appeal_id,
        "suggested_action": suggestion.get("action"),
        "confidence": suggestion.get("confidence"),
        "explanation": suggestion.get("explanation"),
    }


@router.post("/appeals/{appeal_id}/resolve")
async def resolve_appeal(
    appeal_id: str,
    request: AppealResolveRequest,
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Appeal, ModerationDecision)
        .join(ModerationDecision, Appeal.decision_id == ModerationDecision.id)
        .where(Appeal.id == uuid.UUID(appeal_id), ModerationDecision.tenant_id == tenant.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Appeal not found")

    appeal, _ = row
    appeal.status = "approved" if request.action == "approve" else "rejected"
    appeal.reviewer_id = request.reviewer_id
    appeal.review_notes = request.review_notes
    appeal.resolved_at = datetime.utcnow()

    await session.commit()
    return {"appeal_id": appeal_id, "status": appeal.status}
