import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, outerjoin, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.middleware.auth import get_tenant
from app.config import settings
from app.db.connection import get_session
from app.models.database import ModerationDecision, ReviewerAction, Tenant
from app.models.schemas import ReviewActionRequest, ReviewQueueItem, ReviewQueueResponse

router = APIRouter()


@router.get("/review-queue", response_model=ReviewQueueResponse)
async def get_review_queue(
    page: int = 1,
    limit: int = 20,
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    skip = (page - 1) * limit

    # Decisions needing review: low confidence and not yet actioned by a reviewer
    base = (
        select(ModerationDecision)
        .outerjoin(ReviewerAction, ReviewerAction.decision_id == ModerationDecision.id)
        .where(
            ModerationDecision.tenant_id == tenant.id,
            ModerationDecision.confidence < settings.low_confidence_threshold,
            ReviewerAction.id.is_(None),
        )
    )

    count_result = await session.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar() or 0

    items_result = await session.execute(
        base.order_by(ModerationDecision.created_at.desc()).offset(skip).limit(limit)
    )
    decisions = items_result.scalars().all()

    return ReviewQueueResponse(
        items=[
            ReviewQueueItem(
                decision_id=str(d.id),
                content_text=d.content_text,
                content_type=d.content_type,
                user_id=d.user_id,
                action=d.action,
                confidence=d.confidence,
                categories=d.categories or [],
                explanation=d.explanation or "",
                appeal_text=d.appeal_text or "",
                triage_result=d.triage_result or "",
                created_at=d.created_at.isoformat(),
            )
            for d in decisions
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("/review-queue/{decision_id}/action")
async def take_review_action(
    decision_id: str,
    request: ReviewActionRequest,
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(ModerationDecision).where(
            ModerationDecision.id == uuid.UUID(decision_id),
            ModerationDecision.tenant_id == tenant.id,
        )
    )
    decision = result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    action = ReviewerAction(
        decision_id=decision.id,
        reviewer_id=request.reviewer_id,
        action_taken=request.action_taken,
        override_action=request.override_action,
        override_reason=request.override_reason,
    )
    session.add(action)

    # Re-embed with the corrected label so future similar content gets the right precedent
    if request.action_taken == "override" and request.override_action and decision.content_text:
        try:
            from app.services.vector_store import upsert_decision
            await upsert_decision(
                decision_id=decision_id,
                content=decision.content_text,
                action=request.override_action,
                categories=decision.categories or [],
                tenant_id=str(tenant.id),
            )
        except Exception:
            pass

    await session.commit()
    return {"status": "ok", "decision_id": decision_id, "action_taken": request.action_taken}
