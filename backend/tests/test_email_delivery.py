"""Provider outcomes retain their retry policy through the contact worker."""

import json
from unittest.mock import AsyncMock, Mock

import httpx
import pytest

from app.adapters.email_adapter import ResendEmailAdapter
from app.core.exceptions import EmailDeliveryError
from app.entities.message import Message
from app.use_cases.send_contact import SendContactUseCase
from app.worker import StreamWorker


@pytest.fixture
def provider(monkeypatch):
    """Intercept the actual HTTP request without opening a network connection."""
    outcome = Mock(return_value=httpx.Response(200, json={"id": "email-test"}))
    client = httpx.AsyncClient(transport=httpx.MockTransport(outcome))
    monkeypatch.setattr("app.adapters.email_adapter.httpx.AsyncClient", lambda: client)
    return outcome


def build_message():
    return Message(
        name="Test",
        email="sender@example.com",
        subject="Hello",
        message="Contact message",
    )


def build_adapter():
    return ResendEmailAdapter("re_fake_test_key", "from@example.com", "to@example.com")


@pytest.mark.parametrize("status", [200, 201])
async def test_provider_acceptance_does_not_depend_on_response_json(provider, status):
    provider.return_value = httpx.Response(status, text="accepted")
    assert await build_adapter().send_message(build_message()) is True
    assert provider.call_count == 1


async def test_user_fields_are_escaped_in_html_but_preserved_in_plain_headers(provider):
    message = Message(
        name='<img src=x onerror="alert(1)"> & Test',
        email='sender+"quoted"@example.com',
        subject='<a href="https://evil.example">Offer</a>',
        message='<script>alert("x")</script>\nSecond paragraph & <b>details</b>',
    )
    assert await build_adapter().send_message(message) is True
    payload = json.loads(provider.call_args.args[0].content)
    html = payload["html"]
    assert "<img" not in html
    assert "<script>" not in html
    assert "<a href=" not in html
    assert "<b>" not in html
    assert "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; Test" in html
    assert "sender+&quot;quoted&quot;@example.com" in html
    assert "&lt;a href=&quot;https://evil.example&quot;&gt;Offer&lt;/a&gt;" in html
    assert (
        "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;\nSecond paragraph &amp; &lt;b&gt;details&lt;/b&gt;"
        in html
    )
    assert payload["subject"] == message.subject
    assert payload["reply_to"] == message.email


@pytest.mark.parametrize("status", [400, 401, 403, 404, 422, 429, 500, 502, 503, 504])
async def test_http_failures_reach_worker_with_correct_retry_policy(
    provider, monkeypatch, status
):
    provider.return_value = httpx.Response(status, text="private provider response")
    use_case = SendContactUseCase(build_adapter(), Mock())
    monkeypatch.setattr("app.worker.get_send_contact_use_case", lambda: use_case)
    monkeypatch.setattr("app.worker.asyncio.sleep", AsyncMock())
    worker = StreamWorker("redis://localhost")
    worker._redis = AsyncMock()
    dlq = AsyncMock()
    monkeypatch.setattr(worker, "_move_to_dlq", dlq)
    body = {
        "job_name": "send_contact_email",
        "payload": {
            "name": "Test",
            "email": "sender@example.com",
            "subject": "Hello",
            "message": "Contact message",
        },
        "meta": {"retry_count": 0},
    }
    data = {"job_name": body["job_name"], "payload": json.dumps(body)}

    with pytest.raises(EmailDeliveryError) as failure:
        await worker.process_job("job-test", data)

    assert failure.value.status_code == status
    assert "private provider response" not in str(failure.value)
    await worker._handle_failure("job-test", body, failure.value)

    if status == 429 or status >= 500:
        assert body["meta"]["failure_class"] == "transient"
        assert body["meta"]["retry_count"] == 1
        queued = json.loads(worker._redis.xadd.call_args.args[1]["payload"])
        assert queued["meta"]["retry_count"] == 1
        assert queued["payload"] == body["payload"]
        dlq.assert_not_awaited()
    else:
        assert body["meta"]["failure_class"] == "permanent"
        worker._redis.xadd.assert_not_awaited()
        dlq.assert_awaited_once()
    worker._redis.xack.assert_awaited_once_with(
        "contact_jobs", "email_workers", "job-test"
    )
    assert provider.call_count == 1


@pytest.mark.parametrize(
    "error", [httpx.ReadTimeout, httpx.ConnectError, httpx.RemoteProtocolError]
)
async def test_transport_failures_are_transient_without_leaking_details(
    provider, error
):
    provider.side_effect = error("private connection details")
    with pytest.raises(EmailDeliveryError) as failure:
        await build_adapter().send_message(build_message())
    assert failure.value.transient is True
    assert failure.value.status_code is None
    assert "private connection details" not in str(failure.value)


async def test_missing_configuration_is_permanent_and_never_calls_provider(provider):
    with pytest.raises(EmailDeliveryError) as failure:
        await ResendEmailAdapter("", "from@example.com", "to@example.com").send_message(
            build_message()
        )
    assert failure.value.transient is False
    provider.assert_not_called()
