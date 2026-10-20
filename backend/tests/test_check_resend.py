"""The manual diagnostic must never send email without explicit opt-in."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from scripts import check_resend
from app.core.exceptions import EmailDeliveryError


@pytest.fixture
def resend_config(monkeypatch):
    config = SimpleNamespace(
        resend_api_key="re_test_secret_value",
        resend_from_email="sender@example.com",
        resend_to_email="owner@example.com",
    )
    monkeypatch.setattr(check_resend, "settings", config)
    adapter = MagicMock()
    adapter.return_value.send_message = AsyncMock(return_value=True)
    monkeypatch.setattr(check_resend, "ResendEmailAdapter", adapter)
    return config, adapter


def test_configuration_check_does_not_send_or_expose_values(resend_config, capsys):
    config, adapter = resend_config

    assert check_resend.main([]) == 0

    adapter.assert_not_called()
    output = capsys.readouterr().out
    for value in vars(config).values():
        assert value not in output


def test_missing_configuration_does_not_send(resend_config):
    config, adapter = resend_config
    config.resend_api_key = ""

    assert check_resend.main(["--send"]) == 1
    adapter.assert_not_called()


@pytest.mark.parametrize("success", [True, False])
def test_explicit_send_reports_delivery_result(resend_config, success):
    config, adapter = resend_config
    adapter.return_value.send_message.return_value = success

    assert check_resend.main(["--send"]) == (0 if success else 1)

    adapter.assert_called_once_with(
        config.resend_api_key, config.resend_from_email, config.resend_to_email
    )
    adapter.return_value.send_message.assert_awaited_once()


@pytest.mark.parametrize("transient", [True, False])
def test_explicit_send_handles_classified_provider_failure(
    resend_config, capsys, transient
):
    _, adapter = resend_config
    adapter.return_value.send_message.side_effect = EmailDeliveryError(
        "provider failure", transient=transient
    )
    assert check_resend.main(["--send"]) == 1
    assert "Test email failed." in capsys.readouterr().out
