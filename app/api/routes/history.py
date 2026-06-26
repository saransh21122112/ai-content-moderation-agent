from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.middleware.auth import get_tenant
from app.db.connection import get_session
from app.models.database import ModerationDecision, ReviewerAction, Tenant

router = APIRouter()


@router.get("/decisions")
async def list_decisions(
    page: int = 1,
    limit: int = Query(20, le=100),
    action: Optional[str] = None,
    content_type: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    query = select(ModerationDecision).where(ModerationDecision.tenant_id == tenant.id)

    if action:
        query = query.where(ModerationDecision.action == action)
    if content_type:
        query = query.where(ModerationDecision.content_type == content_type)
    if user_id:
        query = query.where(ModerationDecision.user_id == user_id)
    if search:
        query = query.where(ModerationDecision.content_text.ilike(f"%{search}%"))

    count_result = await session.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar() or 0

    rows_result = await session.execute(
        query.order_by(ModerationDecision.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    decisions = rows_result.scalars().all()

    return {
        "items": [
            {
                "decision_id": str(d.id),
                "content_text": d.content_text,
                "content_type": d.content_type,
                "user_id": d.user_id,
                "action": d.action,
                "confidence": d.confidence,
                "categories": d.categories or [],
                "explanation": d.explanation,
                "triage_result": d.triage_result,
                "processing_time_ms": d.processing_time_ms,
                "created_at": d.created_at.isoformat(),
            }
            for d in decisions
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, -(-total // limit)),
    }


@router.get("/decisions/{decision_id}")
async def get_decision(
    decision_id: str,
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    import uuid
    from fastapi import HTTPException

    result = await session.execute(
        select(ModerationDecision).where(
            ModerationDecision.id == uuid.UUID(decision_id),
            ModerationDecision.tenant_id == tenant.id,
        )
    )
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Decision not found")

    reviewer_result = await session.execute(
        select(ReviewerAction).where(ReviewerAction.decision_id == d.id)
        .order_by(ReviewerAction.created_at.desc())
    )
    reviewer_actions = reviewer_result.scalars().all()

    return {
        "decision_id": str(d.id),
        "content_text": d.content_text,
        "content_type": d.content_type,
        "user_id": d.user_id,
        "action": d.action,
        "confidence": d.confidence,
        "categories": d.categories or [],
        "explanation": d.explanation,
        "triage_result": d.triage_result,
        "processing_time_ms": d.processing_time_ms,
        "created_at": d.created_at.isoformat(),
        "reviewer_actions": [
            {
                "reviewer_id": ra.reviewer_id,
                "action_taken": ra.action_taken,
                "override_action": ra.override_action,
                "override_reason": ra.override_reason,
                "created_at": ra.created_at.isoformat() if ra.created_at else None,
            }
            for ra in reviewer_actions
        ],
    }
