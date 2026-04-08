"""
Testes de robustez: Idempotência e Rate Limiting.
"""

import pytest
from unittest.mock import AsyncMock

from app.principal import app
from app.controladores.dependencias import obter_enviar_contato_use_case
from app.core.idempotencia import store

# client = TestClient(app) # Removido para usar a fixture


def test_idempotencia_contato(client):
    """Testa se o envio duplicado com mesma chave retorna cache."""
    payload = {
        "nome": "Test User",
        "email": "test@example.com",
        "assunto": "Re: Test",
        "mensagem": "Hello world, this is a long enough message."
    }
    headers = {"Idempotency-Key": "unique-key-123"}
    
    # Mock do Use Case
    mock_uc = AsyncMock()
    mock_uc.executar.return_value = True
    
    app.dependency_overrides[obter_enviar_contato_use_case] = lambda: mock_uc
    
    try:
        # Primeira tentativa
        resp1 = client.post("/api/v1/contato", json=payload, headers=headers)
        assert resp1.status_code == 200
        assert resp1.headers.get("X-Cache-Idempotency") is None
        
        # Segunda tentativa (deve ser cache)
        resp2 = client.post("/api/v1/contato", json=payload, headers=headers)
        assert resp2.status_code == 200
        assert resp2.headers.get("X-Cache-Idempotency") == "HIT"
        assert resp2.json() == resp1.json()
        
        # Verificar que o Use Case só foi chamado UMA vez
        assert mock_uc.executar.call_count == 1
        
    finally:
        app.dependency_overrides.pop(obter_enviar_contato_use_case, None)


def test_idempotencia_contato_aceita_header_legado(client):
    """Mantém compatibilidade com clientes que ainda enviam X-Idempotency-Key."""
    payload = {
        "nome": "Test User",
        "email": "legacy@example.com",
        "assunto": "Re: Test",
        "mensagem": "Hello world, this is a long enough message."
    }
    headers = {"X-Idempotency-Key": "legacy-key-123"}

    mock_uc = AsyncMock()
    mock_uc.executar.return_value = True
    app.dependency_overrides[obter_enviar_contato_use_case] = lambda: mock_uc

    try:
        resp1 = client.post("/api/v1/contato", json=payload, headers=headers)
        assert resp1.status_code == 200

        resp2 = client.post("/api/v1/contato", json=payload, headers=headers)
        assert resp2.status_code == 200
        assert resp2.headers.get("X-Cache-Idempotency") == "HIT"
        assert mock_uc.executar.call_count == 1
    finally:
        app.dependency_overrides.pop(obter_enviar_contato_use_case, None)

def test_rate_limiting_projetos(client):
    """Testa se o limite de 20/minuto funciona para projetos."""
    # Fazer 20 requisições rápidas (limite é 20/min)
    for i in range(20):
        resp = client.get("/api/v1/projetos")
        assert resp.status_code == 200
    
    # A 21ª deve falhar
    resp = client.get("/api/v1/projetos")
    assert resp.status_code == 429, f"Expected 429, got {resp.status_code}. Body: {resp.text}"
    data = resp.json()
    assert "erro" in data, f"Key 'erro' not in response: {data}"
    assert "rate limit exceeded" in data["erro"]["mensagem"].lower()

def test_idempotencia_sem_chave_funciona_normalmente(client):
    """Testa se funciona sem a chave (sem cache)."""
    payload = {
        "nome": "Test User",
        "email": "test@example.com",
        "assunto": "Re: Test",
        "mensagem": "Hello world, this is a long enough message."
    }
    
    mock_uc = AsyncMock()
    mock_uc.executar.return_value = True
    app.dependency_overrides[obter_enviar_contato_use_case] = lambda: mock_uc
    
    try:
        resp1 = client.post("/api/v1/contato", json=payload)
        assert resp1.status_code == 200
        
        # Mudar conteúdo para não cair na deduplicação de 5 min
        payload["mensagem"] = "Different message for second call."
        resp2 = client.post("/api/v1/contato", json=payload)
        assert resp2.status_code == 200
        
        # Sem chave, deve ter chamado duas vezes
        assert mock_uc.executar.call_count == 2
        
    finally:
        app.dependency_overrides.pop(obter_enviar_contato_use_case, None)

def test_idempotencia_em_progresso(client):
    """Testa se requisições simultâneas com mesma chave retornam 409."""
    payload = {
        "nome": "Test User",
        "email": "test@example.com",
        "assunto": "Re: Test",
        "mensagem": "Hello world, this is a long enough message."
    }
    headers = {"Idempotency-Key": "progress-key-456"}
    
    # Simular em progresso manualmente no store
    from app.core.idempotencia import IdempotencyRecord
    import time
    store._cache["progress-key-456"] = IdempotencyRecord(
        status_code=0,
        content={},
        timestamp=time.time(),
        in_progress=True
    )
    
    try:
        resp = client.post("/api/v1/contato", json=payload, headers=headers)
        assert resp.status_code == 409
        assert "already in progress" in resp.json()["detail"].lower()
    finally:
        store._cache.pop("progress-key-456", None)


def test_idempotencia_libera_chave_apos_falha(client):
    """Uma falha não deve deixar a chave travada em progresso até o TTL."""
    payload = {
        "nome": "Test User",
        "email": "retry@example.com",
        "assunto": "Retry test",
        "mensagem": "Hello world, this is a long enough message."
    }
    headers = {"Idempotency-Key": "retry-after-failure"}

    mock_uc = AsyncMock()
    mock_uc.executar.side_effect = [False, True]
    app.dependency_overrides[obter_enviar_contato_use_case] = lambda: mock_uc

    try:
        resp1 = client.post("/api/v1/contato", json=payload, headers=headers)
        assert resp1.status_code == 500

        resp2 = client.post("/api/v1/contato", json=payload, headers=headers)
        assert resp2.status_code == 200
        assert mock_uc.executar.call_count == 2
    finally:
        app.dependency_overrides.pop(obter_enviar_contato_use_case, None)


def test_deduplicacao_nao_envenena_retry_apos_falha(client):
    """Uma falha de entrega não deve marcar o conteúdo como duplicado."""
    payload = {
        "nome": "Test User",
        "email": "no-poison@example.com",
        "assunto": "Retry test",
        "mensagem": "Hello world, this is a long enough message."
    }

    mock_uc = AsyncMock()
    mock_uc.executar.side_effect = [False, True]
    app.dependency_overrides[obter_enviar_contato_use_case] = lambda: mock_uc

    try:
        resp1 = client.post("/api/v1/contato", json=payload)
        assert resp1.status_code == 500

        resp2 = client.post("/api/v1/contato", json=payload)
        assert resp2.status_code == 200
        assert mock_uc.executar.call_count == 2
    finally:
        app.dependency_overrides.pop(obter_enviar_contato_use_case, None)


def test_rate_limiting_contato_por_email(client):
    """Testa se o limite de 10/dia por e-mail funciona."""
    payload = {
        "nome": "Test User",
        "email": "limite@example.com",
        "assunto": "Test",
        "mensagem": "Some message"
    }
    
    # Mock do Use Case para acelerar
    mock_uc = AsyncMock()
    mock_uc.executar.return_value = True
    app.dependency_overrides[obter_enviar_contato_use_case] = lambda: mock_uc
    
    try:
        # Fazer 10 requisições (mudar mensagem para evitar deduplicação de conteúdo)
        for i in range(10):
            payload["mensagem"] = f"Message number {i} for rate limiting test."
            resp = client.post("/api/v1/contato", json=payload)
            assert resp.status_code == 200, f"Error at request {i}: {resp.text}"
            
        # A 11ª deve falhar com 429
        payload["mensagem"] = "Final message that should be blocked."
        resp = client.post("/api/v1/contato", json=payload)
        assert resp.status_code == 429
        assert "rate limit exceeded" in resp.json()["erro"]["mensagem"].lower()
        
    finally:
        app.dependency_overrides.pop(obter_enviar_contato_use_case, None)
