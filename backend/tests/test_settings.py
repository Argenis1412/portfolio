"""Configuration uses English keys and rejects unknown environment values."""

from pathlib import Path

import pytest
from pydantic import ValidationError

from app import __version__
from app.settings import Settings


def test_english_settings_are_loaded_from_environment(monkeypatch):
    values = {
        "APP_NAME": "Configured API",
        "ENVIRONMENT": "production",
        "ALLOWED_ORIGINS": "https://frontend.example.com",
        "REGEX_ALLOWED_ORIGINS": r"^https://preview\.example\.com$",
    }
    for name, value in values.items():
        monkeypatch.setenv(name, value)
    settings = Settings(_env_file=None)
    assert settings.app_name == values["APP_NAME"]
    assert settings.environment == "production"
    assert settings.is_production is True
    assert settings.debug is False
    assert settings.get_allowed_origins() == [values["ALLOWED_ORIGINS"]]
    assert settings.regex_allowed_origins == values["REGEX_ALLOWED_ORIGINS"]


@pytest.mark.parametrize(
    ("environment", "debug", "production"),
    [
        ("local", True, False),
        ("development", True, False),
        ("testing", False, False),
        ("staging", False, False),
        ("production", False, True),
    ],
)
def test_supported_environments(environment, debug, production):
    settings = Settings(_env_file=None, ENVIRONMENT=environment)
    assert settings.debug is debug
    assert settings.is_production is production


@pytest.mark.parametrize(
    "environment", ["producao", "producción", "desenvolvimento", "homologação", "prod"]
)
def test_invalid_environments_fail_instead_of_bypassing_production_guards(environment):
    with pytest.raises(ValidationError, match="ENVIRONMENT"):
        Settings(_env_file=None, ENVIRONMENT=environment)


def test_shared_example_can_configure_the_backend():
    example = Path(__file__).resolve().parents[2] / ".env.example"
    settings = Settings(_env_file=example)
    assert settings.environment == "local"
    assert settings.app_name == "Portfolio Backend API"
    assert "http://localhost:5173" in settings.get_allowed_origins()


def test_public_version_endpoints_use_the_same_source(client):
    assert client.get("/").json()["version"] == __version__
    assert client.get("/api/v1/").json()["version"] == __version__
    assert client.get("/health").json()["api_version"] == __version__
    assert client.get("/openapi.json").json()["info"]["version"] == __version__


def production_settings(**overrides):
    values = dict(
        ENVIRONMENT="production",
        REDIS_URL="redis://localhost:6379/0",
        METRICS_BASIC_AUTH_USERNAME="metrics",
        METRICS_BASIC_AUTH_PASSWORD="test-password",
        ALLOWED_ORIGINS="https://example.com",
        REGEX_ALLOWED_ORIGINS="",
        RESEND_API_KEY="test-key",
        RESEND_TO_EMAIL="owner@example.com",
    )
    values.update(overrides)
    return Settings(_env_file=None, **values)


@pytest.mark.parametrize("variable", ["RESEND_API_KEY", "RESEND_TO_EMAIL"])
@pytest.mark.parametrize("value", ["", "   "])
def test_production_requires_resend(variable, value):
    with pytest.raises(RuntimeError, match=f"{variable} is required in production"):
        production_settings(**{variable: value}).validate_production()


def test_production_accepts_resend_without_explicit_sender():
    production_settings().validate_production()


@pytest.mark.parametrize("environment", ["local", "development", "testing"])
def test_nonproduction_allows_console_delivery(environment):
    Settings(
        _env_file=None,
        ENVIRONMENT=environment,
        RESEND_API_KEY="",
        RESEND_TO_EMAIL="",
    ).validate_production()
