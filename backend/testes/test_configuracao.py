import os
import pytest
from app.configuracao import Configuracoes


def test_debug_desactivado_en_produccion():
    """Garante que debug é falso em produção."""
    os.environ["AMBIENTE"] = "producao"
    settings = Configuracoes()
    assert settings.debug is False
    # Limpa
    if "AMBIENTE" in os.environ:
        del os.environ["AMBIENTE"]


def test_debug_activado_en_desarrollo():
    """Garante que debug é verdadeiro em desenvolvimento."""
    os.environ["AMBIENTE"] = "desenvolvimento"
    settings = Configuracoes()
    assert settings.debug is True
    # Limpa
    if "AMBIENTE" in os.environ:
        del os.environ["AMBIENTE"]


def test_debug_activado_en_local():
    """Garante que debug é verdadeiro no ambiente local."""
    os.environ["AMBIENTE"] = "local"
    settings = Configuracoes()
    assert settings.debug is True
    # Limpa
    if "AMBIENTE" in os.environ:
        del os.environ["AMBIENTE"]


def test_validar_producao_falha_sem_redis_e_metrics_auth():
    os.environ["AMBIENTE"] = "producao"
    os.environ["DATABASE_URL"] = (
        "postgresql+asyncpg://postgres:secret@db.example.com:5432/postgres"
    )
    os.environ.pop("REDIS_URL", None)
    os.environ.pop("METRICS_BASIC_AUTH_USERNAME", None)
    os.environ.pop("METRICS_BASIC_AUTH_PASSWORD", None)

    settings = Configuracoes()

    with pytest.raises(RuntimeError):
        settings.validar_producao()

    for key in [
        "AMBIENTE",
        "DATABASE_URL",
        "REDIS_URL",
        "METRICS_BASIC_AUTH_USERNAME",
        "METRICS_BASIC_AUTH_PASSWORD",
    ]:
        os.environ.pop(key, None)


def test_validar_producao_aceita_supabase_e_metrics_auth():
    os.environ["AMBIENTE"] = "producao"
    os.environ["DATABASE_URL"] = (
        "postgresql+asyncpg://postgres:secret@db.example.com:5432/postgres"
    )
    os.environ["REDIS_URL"] = "redis://localhost:6379/0"
    os.environ["METRICS_BASIC_AUTH_USERNAME"] = "metrics"
    os.environ["METRICS_BASIC_AUTH_PASSWORD"] = "secret"

    settings = Configuracoes()
    settings.validar_producao()

    for key in [
        "AMBIENTE",
        "DATABASE_URL",
        "REDIS_URL",
        "METRICS_BASIC_AUTH_USERNAME",
        "METRICS_BASIC_AUTH_PASSWORD",
    ]:
        os.environ.pop(key, None)
