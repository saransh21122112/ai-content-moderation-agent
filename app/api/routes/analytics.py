from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.middleware.auth import get_tenant
from app.db.connection import get_session
from app.models.database import ModerationDecision, ReviewerAction, Tenant

router = APIRouter()


@router.get("/analytics/summary")
async def get_summary(
    days: int = Query(30, ge=1, le=365),
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    since = datetime.utcnow() - timedelta(days=days)

    result = await session.execute(
        select(
            func.count().label("total"),
            func.sum(case((ModerationDecision.confidence >= 0.85, 1), else_=0)).label("auto_actioned"),
            func.sum(case((ModerationDecision.confidence < 0.85, 1), else_=0)).label("human_reviewed"),
            func.sum(case((ModerationDecision.action == "remove", 1), else_=0)).label("removed"),
            func.sum(case((ModerationDecision.action == "pass", 1), else_=0)).label("passed"),
            func.sum(case((ModerationDecision.action == "warn", 1), else_=0)).label("warned"),
            func.sum(case((ModerationDecision.action == "restrict", 1), else_=0)).label("restricted"),
        ).where(
            ModerationDecision.tenant_id == tenant.id,
            ModerationDecision.created_at >= since,
        )
    )
    row = result.one()

    # False positive rate = overrides-to-pass / total human-reviewed
    fp_result = await session.execute(
        select(func.count()).select_from(ReviewerAction)
        .join(ModerationDecision, ReviewerAction.decision_id == ModerationDecision.id)
        .where(
            ModerationDecision.tenant_id == tenant.id,
            ReviewerAction.action_taken == "override",
            ReviewerAction.override_action == "pass",
            ReviewerAction.created_at >= since,
        )
    )
    fp_count = fp_result.scalar() or 0
    human_reviewed = max(row.human_reviewed or 0, 1)

    return {
        "total_decisions": row.total or 0,
        "auto_actioned": row.auto_actioned or 0,
        "human_reviewed": row.human_reviewed or 0,
        "removed": row.removed or 0,
        "passed": row.passed or 0,
        "warned": row.warned or 0,
        "restricted": row.restricted or 0,
        "false_positive_rate": round(fp_count / human_reviewed, 3),
        "period_days": days,
    }


@router.get("/analytics/categories")
async def get_categories(
    days: int = Query(30, ge=1, le=365),
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    since = datetime.utcnow() - timedelta(days=days)

    result = await session.execute(
        text("""
            SELECT unnest(categories) AS category, COUNT(*) AS count
            FROM moderation_decisions
            WHERE tenant_id = :tenant_id AND created_at >= :since AND categories IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
            LIMIT 10
        """),
        {"tenant_id": str(tenant.id), "since": since},
    )
    rows = result.all()
    return {"categories": [{"category": r.category, "count": r.count} for r in rows]}


@router.get("/analytics/timeline")
async def get_timeline(
    days: int = Query(7, ge=1, le=90),
    tenant: Tenant = Depends(get_tenant),
    session: AsyncSession = Depends(get_session),
):
    since = datetime.utcnow() - timedelta(days=days)

    result = await session.execute(
        text("""
            SELECT DATE(created_at) AS date, action, COUNT(*) AS count
            FROM moderation_decisions
            WHERE tenant_id = :tenant_id AND created_at >= :since
            GROUP BY date, action
            ORDER BY date
        """),
        {"tenant_id": str(tenant.id), "since": since},
    )
    rows = result.all()
    return {
        "timeline": [{"date": str(r.date), "action": r.action, "count": r.count} for r in rows]
    }
