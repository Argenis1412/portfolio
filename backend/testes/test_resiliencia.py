import pytest
from unittest.mock import AsyncMock, patch
import redis
from app.principal import app
from app.core.idempotencia import IdempotencyStore, IdempotencyRecord
import time

@pytest.mark.async_with_redis
async def test_idempotency_store_redis_failure():
    """
    Testa se o IdempotencyStore fallback para memória se o Redis falhar.
    """
    with patch("redis.asyncio.from_url") as mock_redis_factory:
        mock_redis = AsyncMock()
        # Simular falha de conexão no GET
        mock_redis.get.side_effect = redis.exceptions.ConnectionError("Redis is down")
        # Simular falha no SET
        mock_redis.set.side_effect = redis.exceptions.ConnectionError("Redis is down")
        
        mock_redis_factory.return_value = mock_redis
        
        # Criar store num ambiente onde o Redis "existe" mas falha
        with patch("app.configuracao.configuracoes.redis_url", "redis://mock"):
            store = IdempotencyStore(ttl_seconds=60)
            
            # 1. Tentar marcar como em progresso (deve dar fallback para memória)
            acquired = await store.set_in_progress("fail-key")
            assert acquired is True
            
            # Deve estar na memória
            assert "fail-key" in store._cache
            assert store._cache["fail-key"].in_progress is True
            
            # 2. Tentar recuperar algo (falha no Redis -> busca na memória)
            record = await store.get("fail-key")
            assert record is not None
            assert record.in_progress is True
            
            # 3. Finalizar com sucesso
            await store.set("fail-key", 200, {"ok": True})
            
            # Verificar se persistiu na memória
            record = await store.get("fail-key")
            assert record.status_code == 200
            assert record.content == {"ok": True}

async def test_formspree_timeout_fallback(client):
    """
    Simula timeout no Formspree e verifica resposta 500 do backend.
    """
    from app.casos_uso import EnviarContatoUseCase
    from app.controladores.dependencias import obter_enviar_contato_use_case
    from httpx import ConnectTimeout
    
    mock_uc = AsyncMock(spec=EnviarContatoUseCase)
    # Formspree falha com timeout
    mock_uc.executar.side_effect = ConnectTimeout("Formspree timed out")
    
    app.dependency_overrides[obter_enviar_contato_use_case] = lambda: mock_uc
    
    try:
        payload = {
            "nome": "Argenis",
            "email": "timeout@test.com",
            "assunto": "Timeout test",
            "mensagem": "This should result in a 500 error."
        }
        resp = client.post("/api/v1/contato", json=payload)
        
        assert resp.status_code == 500
        assert "ERRO_INTERNO" in resp.json()["erro"]["codigo"]
    finally:
        app.dependency_overrides.pop(obter_enviar_contato_use_case, None)
