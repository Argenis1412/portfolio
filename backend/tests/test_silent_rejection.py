from fastapi.testclient import TestClient

from app.principal import app

client = TestClient(app)


def test_silent_rejection_invalid_subject():
    """Verifies that a message with invalid characters in subject returns 200 Success."""
    payload = {
        "name": "Attacker",
        "email": "attacker@spam.com",
        "subject": "!!! NOTIFICACION DE SEGURIDAD !!!",
        "message": "This should be silently dropped but return success.",
    }
    response = client.post("/api/v1/contact", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_silent_rejection_invalid_email():
    """Verifies that a message with invalid email format returns 200 Success."""
    payload = {
        "name": "User",
        "email": "not-an-email",
        "subject": "Hello",
        "message": "Valid message but invalid email.",
    }
    response = client.post("/api/v1/contact", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_silent_rejection_invalid_name():
    """Verifies that a message with invalid characters in name returns 200 Success."""
    payload = {
        "name": "12345",  # Should fail NAME_REGEX
        "email": "test@test.com",
        "subject": "Test",
        "message": "Valid message but invalid name.",
    }
    response = client.post("/api/v1/contact", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
