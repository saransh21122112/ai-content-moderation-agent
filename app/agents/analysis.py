import json
from typing import Optional
from openai import AsyncOpenAI
from app.config import settings
from app.tools.policy_lookup import lookup_platform_policy
from app.tools.user_history import get_user_history

_client = AsyncOpenAI(api_key=settings.openai_api_key)

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "lookup_platform_policy",
            "description": "Look up the platform's moderation policies for specific content categories.",
            "parameters": {
                "type": "object",
                "properties": {
                    "platform_id": {"type": "string"},
                    "categories": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Content categories to retrieve policies for",
                    },
                },
                "required": ["platform_id", "categories"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_history",
            "description": "Retrieve a user's prior moderation violations and account risk level.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "platform_id": {"type": "string"},
                },
                "required": ["user_id", "platform_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_precedents",
            "description": (
                "Search past moderation decisions for semantically similar content. "
                "Returns the most relevant precedents from this platform's history. "
                "Use this to ensure consistency with how similar content was handled before."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "The content to find precedents for",
                    },
                    "platform_id": {"type": "string"},
                },
                "required": ["content", "platform_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "submit_decision",
            "description": "Submit the final moderation decision after completing analysis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["pass", "warn", "restrict", "remove"],
                        "description": (
                            "pass: allow content; "
                            "warn: keep content but show user a policy warning; "
                            "restrict: limit content distribution; "
                            "remove: take down content immediately"
                        ),
                    },
                    "confidence": {
                        "type": "number",
                        "description": (
                            "Confidence score 0.0–1.0. "
                            "≥0.85 triggers auto-action; <0.85 routes to human review."
                        ),
                    },
                    "categories": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Violated policy categories (empty list if action is pass)",
                    },
                    "explanation": {
                        "type": "string",
                        "description": "Detailed internal explanation for the audit trail",
                    },
                    "appeal_text": {
                        "type": "string",
                        "description": "Clear user-facing explanation for appeal notifications",
                    },
                },
                "required": ["action", "confidence", "categories", "explanation", "appeal_text"],
            },
        },
    },
]

_SYSTEM = """You are a senior content moderation analyst. Flagged content has been sent to you for deep review.

Your process:
1. Call lookup_platform_policy with the flagged categories to understand relevant policies
2. Call get_user_history to factor in prior violations and account risk level
3. Call search_precedents to find how similar content was handled before — ensure consistency
4. Reason carefully: consider context, intent, policies, user history, precedents, and harm potential
5. Call submit_decision with your final verdict

Decision guidance:
- pass: Content is within policy (triage may have been a false positive)
- warn: Minor first offense — educate the user, keep the content
- restrict: Moderate violation or repeat offender — limit content reach
- remove: Clear violation, serious harm, or zero-tolerance category (hate speech, CSAM)

Set confidence ≥0.85 only when highly certain. Use 0.6–0.84 for ambiguous/borderline cases to route to human review.

Your explanation should be thorough and suitable for an audit trail.
Your appeal_text should be written directly to the content creator — be clear, specific, and fair."""


async def _execute_tool(name: str, tool_input: dict) -> str:
    if name == "lookup_platform_policy":
        result = lookup_platform_policy(tool_input["platform_id"], tool_input["categories"])
    elif name == "get_user_history":
        result = get_user_history(tool_input["user_id"], tool_input.get("platform_id", ""))
    elif name == "search_precedents":
        from app.services.vector_store import search_precedents as vs_search
        result = await vs_search(tool_input["content"], tool_input.get("platform_id", ""))
    else:
        result = {"error": f"Unknown tool: {name}"}
    return json.dumps(result)


async def run_analysis(
    content: str,
    triage_result: dict,
    user_id: str,
    platform_id: str,
    context: Optional[dict] = None,
) -> dict:
    prompt = (
        f"Content to analyze:\n---\n{content}\n---\n\n"
        f"Triage result: {json.dumps(triage_result)}\n"
        f"User ID: {user_id}\n"
        f"Platform ID: {platform_id}\n"
        f"Additional context: {json.dumps(context or {})}\n\n"
        "Please analyze this content using the available tools, then submit your decision."
    )

    messages = [
        {"role": "system", "content": _SYSTEM},
        {"role": "user", "content": prompt},
    ]

    for _ in range(10):
        response = await _client.chat.completions.create(
            model=settings.analysis_model,
            messages=messages,
            tools=_TOOLS,
        )

        choice = response.choices[0]
        messages.append(choice.message)

        if choice.finish_reason == "stop":
            break

        if choice.finish_reason == "tool_calls":
            tool_results = []
            decision = None

            for tc in choice.message.tool_calls:
                tool_input = json.loads(tc.function.arguments)
                if tc.function.name == "submit_decision":
                    decision = tool_input
                    tool_results.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": "Decision recorded.",
                    })
                else:
                    result_str = await _execute_tool(tc.function.name, tool_input)
                    tool_results.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": result_str,
                    })

            messages.extend(tool_results)

            if decision:
                return decision

    return {
        "action": "restrict",
        "confidence": 0.5,
        "categories": triage_result.get("categories", []),
        "explanation": "Analysis could not complete — content restricted pending human review.",
        "appeal_text": "Your content has been temporarily restricted while our team reviews it.",
    }
