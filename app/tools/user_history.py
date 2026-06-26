def get_user_history(user_id: str, platform_id: str) -> dict:
    """
    Phase 1: deterministic mock keyed on user_id for consistent test behavior.
    Phase 2: replace with async PostgreSQL query against moderation_decisions.
    """
    seed = sum(ord(c) for c in user_id)
    violation_count = seed % 5

    if violation_count >= 3:
        risk_level = "high"
    elif violation_count >= 1:
        risk_level = "medium"
    else:
        risk_level = "low"

    action_cycle = ["warn", "restrict", "remove"]
    category_cycle = ["spam", "harassment", "misinformation"]
    history = [
        {
            "action": action_cycle[i % 3],
            "category": category_cycle[i % 3],
            "days_ago": (i + 1) * 30,
        }
        for i in range(min(violation_count, 3))
    ]

    return {
        "user_id": user_id,
        "platform_id": platform_id,
        "total_violations": violation_count,
        "recent_violations_30d": min(violation_count, 1),
        "account_age_days": (seed % 1000) + 30,
        "risk_level": risk_level,
        "is_verified": seed % 3 == 0,
        "previous_actions": history,
    }
