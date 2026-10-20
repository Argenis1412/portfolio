"""Contact validation rejects malformed inputs and preserves message paragraphs."""

import pytest
from unittest.mock import AsyncMock

from app.controllers.dependencies import get_send_contact_use_case
from app.main import app


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "   "),
        ("message", " \n\t "),
        ("email", "not-an-email"),
    ],
)
def test_invalid_contact_is_rejected_before_delivery(client, field, value):
    use_case = AsyncMock()
    app.dependency_overrides[get_send_contact_use_case] = lambda: use_case
    payload = {
        "name": "Test",
        "email": "sender@example.com",
        "message": "Valid message.",
    }
    payload[field] = value
    response = client.post("/api/v1/contact", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INPUT_VALIDATION_ERROR"
    use_case.execute.assert_not_awaited()


def test_contact_preserves_paragraphs_and_normalizes_header_whitespace(client):
    use_case = AsyncMock()
    app.dependency_overrides[get_send_contact_use_case] = lambda: use_case
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "  Test   User ",
            "email": "sender@example.com",
            "subject": "Interview\r\n invitation",
            "message": "  First line\n\nSecond line.  ",
        },
    )
    assert response.status_code == 200
    kwargs = use_case.execute.call_args.kwargs
    assert kwargs["name"] == "Test User"
    assert kwargs["subject"] == "Interview invitation"
    assert kwargs["message"] == "First line\n\nSecond line."
