"""
Tests for Honeypot and Spam Scoring defense layers.
"""

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.controllers.dependencies import get_send_contact_use_case
from app.core.honeypot import is_honeypot_triggered
from app.principal import app

client = TestClient(app)


@pytest.fixture
def mock_use_case():
    uc = AsyncMock()
    uc.execute.return_value = True
    app.dependency_overrides[get_send_contact_use_case] = lambda: uc
    try:
        yield uc
    finally:
        app.dependency_overrides.pop(get_send_contact_use_case, None)


def test_honeypot_triggered(mock_use_case):
    """Verifica se o honeypot bloqueia o envio mas retorna sucesso falso."""
    payload = {
        "name": "Bot",
        "email": "bot@spam.com",
        "subject": "Spam bot",
        "message": "I am a bot filling all fields.",
        "website": "http://evilbot.com",  # Honeypot field
    }

    response = client.post("/api/v1/contact", json=payload)

    assert response.status_code == 200
    assert response.json()["success"] is True
    # O Caso de Uso NÃO deve ter sido chamado
    mock_use_case.execute.assert_not_called()


def test_spam_score_high_silent_drop(mock_use_case):
    """Verifica se score muito alto (>70) causa drop silencioso."""
    payload = {
        "name": "Spammer",
        "email": "spammer@temp-mail.org",  # +40 pts
        "subject": "Cheap Bitcoin",
        "message": "Buy bitcoin now! http://spam1.com http://spam2.com http://spam3.com official winner prize",  # +25 pts (links) + 30 pts (keywords)
    }

    response = client.post("/api/v1/contact", json=payload)

    assert response.status_code == 200
    assert response.json()["success"] is True
    # O Caso de Uso NÃO deve ter sido chamado
    mock_use_case.execute.assert_not_called()


def test_spam_score_medium_suspect(mock_use_case):
    """Verifica se score médio (>30) marca como [SUSPECT]."""
    payload = {
        "name": "Suspicious User",
        "email": "user@gmail.com",
        "subject": "Inquiry",
        "message": "Official marketing offer for your project: http://mysite.com",
    }

    response = client.post("/api/v1/contact", json=payload)

    assert response.status_code == 200
    # O Caso de Uso deve ter sido chamado com is_suspicious=True
    mock_use_case.execute.assert_called_once()
    args, kwargs = mock_use_case.execute.call_args
    assert kwargs["is_suspicious"] is True
    assert kwargs["spam_score"] > 30


def test_normal_message_not_suspect(mock_use_case):
    """Verifica se message normal passa sem marcação."""
    payload = {
        "name": "Argenis",
        "email": "argenis@example.com",
        "subject": "Job Opportunity",
        "message": "Hello, I would like to talk about a backend role.",
    }

    response = client.post("/api/v1/contact", json=payload)

    assert response.status_code == 200
    mock_use_case.execute.assert_called_once()
    args, kwargs = mock_use_case.execute.call_args
    assert kwargs["is_suspicious"] is False


def test_honeypot_is_triggered_with_empty_data():
    """Verifica retorno False cuando los datos no tienen spam fields."""
    assert is_honeypot_triggered({"name": "John", "email": "j@mock.com"}) is False


def test_honeypot_is_triggered_with_spam_fields():
    """Verifica retorno True al alimentar arrays conteniendo campos como website, fax, company, middle_name."""
    assert is_honeypot_triggered({"website": "http://spam.com"}) is True
    assert is_honeypot_triggered({"fax": "12345"}) is True
    assert is_honeypot_triggered({"company": "Spam Corp"}) is True
    assert is_honeypot_triggered({"middle_name": "Danger"}) is True
