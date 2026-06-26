DEFAULT_POLICIES: dict = {
    "harassment": {
        "description": "Content that attacks or demeans individuals",
        "examples": ["Direct insults targeting an individual", "Threatening language", "Doxxing"],
        "warn_threshold": "general insults not targeting a specific identity",
        "restrict_threshold": "coordinated harassment or repeated targeting",
        "remove_threshold": "direct threats, doxxing, or severe targeted harassment",
    },
    "hate_speech": {
        "description": "Content promoting hatred against protected groups",
        "examples": ["Slurs", "Dehumanizing language", "Supremacist content"],
        "remove_threshold": "any verified hate speech — zero tolerance policy",
    },
    "spam": {
        "description": "Unsolicited bulk content or deceptive promotions",
        "examples": ["Repetitive posts", "Fake giveaways", "Undisclosed affiliate links"],
        "warn_threshold": "first offense or borderline promotion",
        "restrict_threshold": "repeated spam or clearly deceptive content",
        "remove_threshold": "coordinated inauthentic behavior or platform manipulation",
    },
    "explicit_content": {
        "description": "Adult content not suitable for general audiences",
        "examples": ["Nudity", "Sexual content", "CSAM"],
        "remove_threshold": "non-consensual content or any content involving minors — absolute zero tolerance",
        "restrict_threshold": "adult content without proper age gate",
    },
    "violence": {
        "description": "Graphic violence or promotion of violent acts",
        "examples": ["Graphic gore", "Celebration of mass violence", "Terrorism promotion"],
        "restrict_threshold": "gratuitous violence without journalistic or educational context",
        "remove_threshold": "glorification, promotion, or incitement of violence",
    },
    "self_harm": {
        "description": "Content promoting self-harm or suicide",
        "examples": ["Method sharing", "Glorification of self-harm", "Eating disorder promotion"],
        "remove_threshold": "any content promoting or instructing self-harm — show crisis resources to user",
    },
    "misinformation": {
        "description": "Demonstrably false information with real-world harm potential",
        "examples": ["Dangerous medical advice", "Election misinformation", "Vaccine disinformation"],
        "restrict_threshold": "unverified health claims that could cause harm",
        "remove_threshold": "demonstrably false information with clear harm potential",
    },
}


def lookup_platform_policy(platform_id: str, categories: list[str]) -> dict:
    policies = {}
    for category in categories:
        policies[category] = DEFAULT_POLICIES.get(
            category,
            {
                "description": f"General content policy for {category}",
                "note": "Apply standard community guidelines",
            },
        )
    return {"platform_id": platform_id, "policies": policies}
