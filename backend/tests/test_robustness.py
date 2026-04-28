"""
Robustness tests: Idempotency and Rate Limiting.
"""

from unittest.mock import AsyncMock

from app.controllers.dependencies import get_send_contact_use_case
from app.core.idempotency import store
from app.main import app

# client = TestClient(app) # Removed to use fixture


def test_idempotencia_contact(client):
    """Testa se o envio duplicado com mesma chave retorna cache."""
    payload = {
        "name": "Test User",
        "email": "test@example.com",
        "subject": "Re: Test",
        "message": "Hello world, this is a long enough message.",
    }
    headers = {"Idempotency-Key": "unique-key-123"}

    # Mock do Use Case
    mock_uc = AsyncMock()
    mock_uc.execute.return_value = True

    app.dependency_overrides[get_send_contact_use_case] = lambda: mock_uc

    try:
        # Primeira tentativa
        resp1 = client.post("/api/v1/contact", json=payload, headers=headers)
        assert resp1.status_code == 200
        assert resp1.headers.get("X-Cache-Idempotency") is None

        # Segunda tentativa (deve ser cache)
        resp2 = client.post("/api/v1/contact", json=payload, headers=headers)
        assert resp2.status_code == 200
        assert resp2.headers.get("X-Cache-Idempotency") == "HIT"
        assert resp2.json() == resp1.json()

        # Verificar que o Use Case só foi chamado UMA vez
        assert mock_uc.execute.call_count == 1

    finally:
        app.dependency_overrides.pop(get_send_contact_use_case, None)


def test_idempotency_contact_accepts_legacy_header(client):
    """Ensures backward-compatibility with clients still sending X-Idempotency-Key."""
    payload = {
        "name": "Test User",
        "email": "legacy@example.com",
        "subject": "Re: Test",
        "message": "Hello world, this is a long enough message.",
    }
    headers = {"X-Idempotency-Key": "legacy-key-123"}

    mock_uc = AsyncMock()
    mock_uc.execute.return_value = True
    app.dependency_overrides[get_send_contact_use_case] = lambda: mock_uc

    try:
        resp1 = client.post("/api/v1/contact", json=payload, headers=headers)
        assert resp1.status_code == 200

        resp2 = client.post("/api/v1/contact", json=payload, headers=headers)
        assert resp2.status_code == 200
        assert resp2.headers.get("X-Cache-Idempotency") == "HIT"
        assert mock_uc.execute.call_count == 1
    finally:
        app.dependency_overrides.pop(get_send_contact_use_case, None)


def test_rate_limiting_projects(client):
    """Testa se o limite de 20/minuto funciona para projects."""
    # Fazer 20 requisições rápidas (limite é 20/min)
    for i in range(20):
        resp = client.get("/api/v1/projects")
        assert resp.status_code == 200

    # A 21ª deve falhar
    resp = client.get("/api/v1/projects")
    assert resp.status_code == 429, (
        f"Expected 429, got {resp.status_code}. Body: {resp.text}"
    )
    data = resp.json()
    assert "error" in data, f"Key 'error' not in response: {data}"
    assert "rate limit exceeded" in data["error"]["message"].lower()


def test_idempotency_without_key_works_normally(client):
    """Tests that the endpoint works without an idempotency key (no caching)."""
    payload = {
        "name": "Test User",
        "email": "test@example.com",
        "subject": "Re: Test",
        "message": "Hello world, this is a long enough message.",
    }

    mock_uc = AsyncMock()
    mock_uc.execute.return_value = True
    app.dependency_overrides[get_send_contact_use_case] = lambda: mock_uc

    try:
        resp1 = client.post("/api/v1/contact", json=payload)
        assert resp1.status_code == 200

        # Change content to avoid 5 min deduplication
        payload["message"] = "Different message for second call."
        resp2 = client.post("/api/v1/contact", json=payload)
        assert resp2.status_code == 200

        # Sem chave, deve ter chamado duas vezes
        assert mock_uc.execute.call_count == 2

    finally:
        app.dependency_overrides.pop(get_send_contact_use_case, None)


def test_idempotencia_em_progresso(client):
    """Testa se requisições simultâneas com mesma chave retornam 409."""
    payload = {
        "name": "Test User",
        "email": "test@example.com",
        "subject": "Re: Test",
        "message": "Hello world, this is a long enough message.",
    }
    headers = {"Idempotency-Key": "progress-key-456"}

    # Simular em progresso manualmente no store
    import time

    from app.core.idempotency import IdempotencyRecord

    store._cache["progress-key-456"] = IdempotencyRecord(
        status_code=0, content={}, timestamp=time.time(), in_progress=True
    )

    try:
        resp = client.post("/api/v1/contact", json=payload, headers=headers)
        assert resp.status_code == 409
        assert "already in progress" in resp.json()["error"]["message"].lower()
    finally:
        store._cache.pop("progress-key-456", None)


def test_rate_limiting_contact_por_email(client):
    """Testa se o limite de 10/dia por e-mail funciona."""
    payload = {
        "name": "Test User",
        "email": "limite@example.com",
        "subject": "Test",
        "message": "Some message",
    }

    # Mock Use Case to speed up
    mock_uc = AsyncMock()
    mock_uc.execute.return_value = True
    app.dependency_overrides[get_send_contact_use_case] = lambda: mock_uc

    try:
        # Make 10 requests (change message to avoid content deduplication)
        for i in range(10):
            payload["message"] = f"Message number {i} for rate limiting test."
            resp = client.post("/api/v1/contact", json=payload)
            assert resp.status_code == 200, f"Error at request {i}: {resp.text}"

        # A 11ª deve falhar com 429
        payload["message"] = "Final message that should be blocked."
        resp = client.post("/api/v1/contact", json=payload)
        assert resp.status_code == 429
        assert "rate limit exceeded" in resp.json()["error"]["message"].lower()

    finally:
        app.dependency_overrides.pop(get_send_contact_use_case, None)


def test_rate_limiter_redis_fallback(client, monkeypatch):
    """Testa se uma falha no Redis faz o RateLimiter falhar estaticamente permitindo a request."""

    # Fazer a hit connection lançar Exception genérica simulando `redis.exceptions.ConnectionError`.
    def mock_hit(*args, **kwargs):
        raise ConnectionError("Redis is down")

    monkeypatch.setattr("app.core.rate_limit.limiter.limiter.hit", mock_hit)

    payload = {
        "name": "Test User",
        "email": "limite_fallback@example.com",
        "subject": "Test",
        "message": "Some message that should pass despite redis dead.",
    }

    mock_uc = AsyncMock()
    mock_uc.execute.return_value = True
    app.dependency_overrides[get_send_contact_use_case] = lambda: mock_uc

    try:
        resp = client.post("/api/v1/contact", json=payload)
        # Instead of HTTP 500, the system returns HTTP 200 thanks to fallback!
        assert resp.status_code == 200
        assert mock_uc.execute.call_count == 1
    finally:
        app.dependency_overrides.pop(get_send_contact_use_case, None)
