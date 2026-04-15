from fastapi.testclient import TestClient
from app.principal import app

client = TestClient(app)


def test_silent_rejection_invalid_subject():
    """Verifies that a message with invalid characters in subject returns 200 Success."""
    payload = {
        "nome": "Attacker",
        "email": "attacker@spam.com",
        "assunto": "!!! NOTIFICACION DE SEGURIDAD !!!",
        "mensagem": "This should be silently dropped but return success.",
    }
    response = client.post("/api/v1/contato", json=payload)
    assert response.status_code == 200
    assert response.json()["sucesso"] is True


def test_silent_rejection_invalid_email():
    """Verifies that a message with invalid email format returns 200 Success."""
    payload = {
        "nome": "User",
        "email": "not-an-email",
        "assunto": "Hello",
        "mensagem": "Valid message but invalid email.",
    }
    response = client.post("/api/v1/contato", json=payload)
    assert response.status_code == 200
    assert response.json()["sucesso"] is True


def test_silent_rejection_invalid_name():
    """Verifies that a message with invalid characters in name returns 200 Success."""
    payload = {
        "nome": "12345",  # Should fail NOME_REGEX
        "email": "test@test.com",
        "assunto": "Test",
        "mensagem": "Valid message but invalid name.",
    }
    response = client.post("/api/v1/contato", json=payload)
    assert response.status_code == 200
    assert response.json()["sucesso"] is True
