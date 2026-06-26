import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

MOCK_TRIAGE_SAFE = {
    "severity": "safe",
    "primary_category": "safe",
    "categories": ["safe"],
    "reason": "Content is friendly and benign.",
}

MOCK_TRIAGE_SUSPICIOUS = {
    "severity": "suspicious",
    "primary_category": "harassment",
    "categories": ["harassment"],
    "reason": "Content contains potentially hostile language.",
}

MOCK_TRIAGE_CRITICAL = {
    "severity": "critical",
    "primary_category": "hate_speech",
    "categories": ["hate_speech"],
    "reason": "Content contains clear hate speech.",
}

MOCK_DECISION_WARN = {
    "action": "warn",
    "confidence": 0.87,
    "categories": ["harassment"],
    "explanation": "Content contains mild hostile language.",
    "appeal_text": "Your post was flagged for potentially hostile language.",
}

MOCK_DECISION_REMOVE = {
    "action": "remove",
    "confidence": 0.96,
    "categories": ["hate_speech"],
    "explanation": "Content contains clear hate speech with slurs.",
    "appeal_text": "Your post was removed for violating our hate speech policy.",
}


def _make_openai_tool_response(tool_name: str, tool_args: dict) -> MagicMock:
    tc = MagicMock()
    tc.function.name = tool_name
    tc.function.arguments = json.dumps(tool_args)

    msg = MagicMock()
    msg.tool_calls = [tc]

    choice = MagicMock()
    choice.message = msg
    choice.finish_reason = "tool_calls"

    response = MagicMock()
    response.choices = [choice]
    return response


async def test_triage_safe_content():
    with patch("app.agents.triage._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(
            return_value=_make_openai_tool_response("submit_triage", MOCK_TRIAGE_SAFE)
        )

        from app.agents.triage import run_triage
        result = await run_triage("Hello, how are you today?", "platform_123")

        assert result["severity"] == "safe"
        assert result["primary_category"] == "safe"


async def test_orchestrator_passes_safe_content():
    with patch("app.agents.orchestrator.run_triage", new_callable=AsyncMock) as mock_triage:
        mock_triage.return_value = MOCK_TRIAGE_SAFE

        from app.agents.orchestrator import moderate_content
        result = await moderate_content(
            content="Hello everyone, great day!",
            user_id="user_001",
            platform_id="platform_123",
        )

        assert result["action"] == "pass"
        assert result["triage_result"] == "safe"
        assert result["confidence"] == 0.95
        assert "decision_id" in result
        assert result["processing_time_ms"] >= 0


async def test_orchestrator_warns_on_harassment():
    with (
        patch("app.agents.orchestrator.run_triage", new_callable=AsyncMock) as mock_triage,
        patch("app.agents.orchestrator.run_analysis", new_callable=AsyncMock) as mock_analysis,
        patch("app.agents.orchestrator.upsert_decision", new_callable=AsyncMock),
    ):
        mock_triage.return_value = MOCK_TRIAGE_SUSPICIOUS
        mock_analysis.return_value = MOCK_DECISION_WARN

        from app.agents.orchestrator import moderate_content
        result = await moderate_content(
            content="You are such a terrible person",
            user_id="user_002",
            platform_id="platform_123",
        )

        assert result["action"] == "warn"
        assert result["confidence"] == 0.87
        assert "harassment" in result["categories"]
        assert result["triage_result"] == "suspicious"
        assert result["confidence"] >= 0.85


async def test_orchestrator_removes_hate_speech():
    with (
        patch("app.agents.orchestrator.run_triage", new_callable=AsyncMock) as mock_triage,
        patch("app.agents.orchestrator.run_analysis", new_callable=AsyncMock) as mock_analysis,
        patch("app.agents.orchestrator.upsert_decision", new_callable=AsyncMock),
    ):
        mock_triage.return_value = MOCK_TRIAGE_CRITICAL
        mock_analysis.return_value = MOCK_DECISION_REMOVE

        from app.agents.orchestrator import moderate_content
        result = await moderate_content(
            content="[hate speech content]",
            user_id="user_003",
            platform_id="platform_123",
        )

        assert result["action"] == "remove"
        assert result["confidence"] == 0.96
        assert "hate_speech" in result["categories"]
        assert result["triage_result"] == "critical"
        assert result["confidence"] >= 0.85


async def test_low_confidence_flags_for_human_review():
    with (
        patch("app.agents.orchestrator.run_triage", new_callable=AsyncMock) as mock_triage,
        patch("app.agents.orchestrator.run_analysis", new_callable=AsyncMock) as mock_analysis,
        patch("app.agents.orchestrator.upsert_decision", new_callable=AsyncMock),
    ):
        mock_triage.return_value = MOCK_TRIAGE_SUSPICIOUS
        mock_analysis.return_value = {
            "action": "restrict",
            "confidence": 0.72,
            "categories": ["misinformation"],
            "explanation": "Borderline claim — context unclear.",
            "appeal_text": "Your post is under review.",
        }

        from app.agents.orchestrator import moderate_content
        result = await moderate_content(
            content="This new study shows vaccines cause problems",
            user_id="user_004",
            platform_id="platform_123",
        )

        assert result["confidence"] < 0.85


async def test_rekognition_auto_remove_high_confidence():
    mock_image_result = {
        "flagged": True,
        "categories": ["Explicit Nudity", "Graphic Violence"],
        "confidence": 0.98,
        "available": True,
    }

    with (
        patch("app.agents.orchestrator.analyze_image_s3", return_value=mock_image_result),
        patch("app.agents.orchestrator.run_triage", new_callable=AsyncMock) as mock_triage,
    ):
        from app.agents.orchestrator import moderate_content
        result = await moderate_content(
            content="image_key.jpg",
            user_id="user_005",
            platform_id="platform_123",
            content_type="image",
            context={"s3_bucket": "my-bucket", "s3_key": "image_key.jpg"},
        )

        assert result["action"] == "remove"
        assert result["confidence"] == 0.98
        assert "Explicit Nudity" in result["categories"]
        mock_triage.assert_not_called()


async def test_search_precedents_returns_empty_without_pinecone():
    from app.services.vector_store import search_precedents
    result = await search_precedents("some content", "tenant_123")
    assert result == []


async def test_webhook_delivery():
    from app.services.webhook import deliver_webhook

    with patch("httpx.AsyncClient") as mock_http:
        mock_instance = AsyncMock()
        mock_http.return_value.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_http.return_value.__aexit__ = AsyncMock(return_value=False)

        await deliver_webhook(
            url="https://example.com/webhook",
            job_id="job_abc",
            result={"action": "remove", "confidence": 0.9},
            secret="my_secret",
        )

        mock_instance.post.assert_called_once()
        call_kwargs = mock_instance.post.call_args
        assert "X-Webhook-Signature" in call_kwargs.kwargs["headers"]
