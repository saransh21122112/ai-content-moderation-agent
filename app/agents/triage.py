import json
from openai import AsyncOpenAI
from app.config import settings

_client = AsyncOpenAI(api_key=settings.openai_api_key)

_TRIAGE_TOOL = {
    "type": "function",
    "function": {
        "name": "submit_triage",
        "description": "Submit the triage classification for the content being reviewed.",
        "parameters": {
            "type": "object",
            "properties": {
                "severity": {
                    "type": "string",
                    "enum": ["safe", "suspicious", "critical"],
                    "description": (
                        "safe: content complies with policies; "
                        "suspicious: possible violation needing deeper review; "
                        "critical: clear violation (threats, slurs, CSAM, graphic violence)"
                    ),
                },
                "primary_category": {
                    "type": "string",
                    "enum": [
                        "safe", "spam", "harassment", "hate_speech",
                        "explicit_content", "violence", "self_harm", "misinformation", "other",
                    ],
                },
                "categories": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "All applicable content categories",
                },
                "reason": {
                    "type": "string",
                    "description": "One sentence explaining this classification",
                },
            },
            "required": ["severity", "primary_category", "categories", "reason"],
        },
    },
}

_SYSTEM = """You are a content moderation triage agent. Quickly classify incoming content.

Severity levels:
- safe: No policy violation apparent
- suspicious: Possible violation — needs deeper analysis
- critical: Clear, unambiguous violation (threats, slurs, CSAM, graphic violence)

When in doubt between safe and suspicious, choose suspicious.
Always call submit_triage."""


async def run_triage(content: str, platform_id: str) -> dict:
    response = await _client.chat.completions.create(
        model=settings.triage_model,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": f"Platform: {platform_id}\n\nContent:\n{content}"},
        ],
        tools=[_TRIAGE_TOOL],
        tool_choice={"type": "function", "function": {"name": "submit_triage"}},
    )

    message = response.choices[0].message
    if message.tool_calls:
        for tc in message.tool_calls:
            if tc.function.name == "submit_triage":
                return json.loads(tc.function.arguments)

    return {
        "severity": "suspicious",
        "primary_category": "other",
        "categories": ["other"],
        "reason": "Triage classification failed — escalating for review.",
    }
