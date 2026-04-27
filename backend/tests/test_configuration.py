import os

import pytest

from app.settings import Settings


def test_debug_desactivado_en_produccion():
    """Garante que debug é falso em produção."""
    os.environ["AMBIENTE"] = "producao"
    settings = Settings()
    assert settings.debug is False
    if "AMBIENTE" in os.environ:
        del os.environ["AMBIENTE"]


def test_debug_activado_en_desarrollo():
    """Garante que debug é verdadeiro em desenvolvimento."""
    os.environ["AMBIENTE"] = "desenvolvimento"
    settings = Settings()
    assert settings.debug is True
    if "AMBIENTE" in os.environ:
        del os.environ["AMBIENTE"]


def test_debug_activado_en_local():
    """Garante que debug é verdadeiro no ambiente local."""
    os.environ["AMBIENTE"] = "local"
    settings = Settings()
    assert settings.debug is True
    if "AMBIENTE" in os.environ:
        del os.environ["AMBIENTE"]


def test_validate_production_falha_sem_redis_e_metrics_auth():
    os.environ["AMBIENTE"] = "producao"
    os.environ["DATABASE_URL"] = (
        "postgresql+asyncpg://postgres:secret@db.example.com:5432/postgres"
    )
    os.environ.pop("REDIS_URL", None)
    os.environ.pop("METRICS_BASIC_AUTH_USERNAME", None)
    os.environ.pop("METRICS_BASIC_AUTH_PASSWORD", None)

    settings = Settings()

    with pytest.raises(RuntimeError):
        settings.validate_production()

    for key in [
        "AMBIENTE",
        "DATABASE_URL",
        "REDIS_URL",
        "METRICS_BASIC_AUTH_USERNAME",
        "METRICS_BASIC_AUTH_PASSWORD",
    ]:
        os.environ.pop(key, None)


def test_validate_production_aceita_supabase_e_metrics_auth():
    os.environ["AMBIENTE"] = "producao"
    os.environ["DATABASE_URL"] = (
        "postgresql+asyncpg://postgres:secret@db.example.com:5432/postgres"
    )
    os.environ["REDIS_URL"] = "redis://localhost:6379/0"
    os.environ["METRICS_BASIC_AUTH_USERNAME"] = "metrics"
    os.environ["METRICS_BASIC_AUTH_PASSWORD"] = "secret"

    settings = Settings()
    settings.validate_production()

    for key in [
        "AMBIENTE",
        "DATABASE_URL",
        "REDIS_URL",
        "METRICS_BASIC_AUTH_USERNAME",
        "METRICS_BASIC_AUTH_PASSWORD",
    ]:
        os.environ.pop(key, None)


# --- A1: Security — API docs must be disabled in production ---


def test_docs_accesibles_en_local(client):
    """
    /openapi.json must be accessible in local/dev environments.
    The test client runs with AMBIENTE=local (default), so the app was
    created with docs_url/redoc_url/openapi_url set — 200 expected.
    """
    response = client.get("/openapi.json")
    assert response.status_code == 200


def test_root_no_expone_docs_en_produccion(client):
    """
    Root endpoint must not advertise /docs path in production.
    Leaking the docs path is an unnecessary hint for attackers.
    We patch is_production at the settings instance level to simulate prod.
    """
    from unittest.mock import PropertyMock, patch

    from app.settings import settings

    with patch.object(
        type(settings), "is_production", new_callable=PropertyMock, return_value=True
    ):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert (
            "docs" not in data
        ), "Root endpoint must not include 'docs' key in production"


def test_root_expone_docs_en_local(client):
    """Root endpoint includes 'docs' key only in non-production environments."""
    from unittest.mock import PropertyMock, patch

    from app.settings import settings

    with patch.object(
        type(settings), "is_production", new_callable=PropertyMock, return_value=False
    ):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "docs" in data
        assert data["docs"] == "/docs"
