from typing import Optional
from app.agents.analysis import run_analysis


async def reanalyze_for_appeal(
    content: str,
    original_action: str,
    appeal_reason: str,
    user_id: str,
    platform_id: str,
    original_categories: list,
) -> dict:
    triage_result = {
        "severity": "suspicious",
        "primary_category": original_categories[0] if original_categories else "other",
        "categories": original_categories,
        "reason": f"Re-analysis requested: original action was '{original_action}'. Reviewing appeal.",
    }
    context = {
        "is_appeal_review": True,
        "original_action": original_action,
        "appeal_reason": appeal_reason,
        "instruction": (
            "This content has been appealed by the user. "
            "Read their appeal reason carefully and determine whether the original decision was correct. "
            "Give the benefit of the doubt where policy genuinely allows it. "
            "If the original decision was wrong, say so."
        ),
    }
    return await run_analysis(content, triage_result, user_id, platform_id, context)
