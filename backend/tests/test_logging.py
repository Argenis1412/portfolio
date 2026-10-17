"""Shared email masking protects request identities and structured logs."""

import io
import json

import pytest
import structlog
from starlette.requests import Request

from app.adapters.logger_adapter import StructuredLogger, _mask_pii
from app.core.middleware import _get_loggable_identity
from app.utils.email import mask_email


@pytest.mark.parametrize(
    "email,expected",
    [
        ("john@EXAMPLE.COM", "j***@example.com"),
        ("a@example.com", "a***@example.com"),
        ("josé@example.com", "j***@example.com"),
        ("@example.com", "****@example.com"),
        ("invalid-email", "***"),
        ("", "***"),
    ],
)
def test_email_masking_is_consistent_and_idempotent(email, expected):
    assert mask_email(email) == expected
    assert mask_email(expected) == expected
    event = _mask_pii(None, "info", {"email": email})
    assert event["email"] == expected

    request = Request({"type": "http"})
    request.state.identity = f"email:{email}"
    assert _get_loggable_identity(request) == f"email:{expected}"


def test_rendered_log_masks_pii_and_preserves_context():
    output = io.StringIO()
    logger = StructuredLogger("test")
    processors = [
        *structlog.get_config()["processors"][:-1],
        structlog.processors.JSONRenderer(),
    ]
    logger.logger = structlog.wrap_logger(
        structlog.PrintLogger(file=output), processors=processors
    )

    logger.info(
        "contact_test",
        email="john@EXAMPLE.COM",
        phone="+55 (41) 98765-4321",
        request_id="test-request",
    )

    event = json.loads(output.getvalue())
    assert event["email"] == "j***@example.com"
    assert event["phone"] == "55****21"
    assert event["event"] == "contact_test"
    assert event["request_id"] == "test-request"
    assert event["level"] == "info"
    assert "timestamp" in event
