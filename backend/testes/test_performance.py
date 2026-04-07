import pytest
from fastapi.testclient import TestClient
from app.principal import app

def test_etag_and_304_not_modified(client):
    """
    Testa se o backend gera ETags e responde com 304 quando o conteúdo não mudou.
    """
    # 1. Primeira requisição para obter o ETag
    resp1 = client.get("/api/v1/sobre")
    assert resp1.status_code == 200
    etag = resp1.headers.get("ETag")
    assert etag is not None
    assert resp1.headers.get("Cache-Control") is not None
    
    # 2. Segunda requisição enviando If-None-Match
    resp2 = client.get("/api/v1/sobre", headers={"If-None-Match": etag})
    
    # Deve retornar 304 Not Modified
    assert resp2.status_code == 304
    # 304 NÃO deve ter corpo
    assert resp2.text == ""
    # Deve manter os headers de cache
    assert resp2.headers.get("ETag") == etag
    assert "public" in resp2.headers.get("Cache-Control")

def test_etag_changes_when_content_changes(client):
    """
    Verifica se o ETag muda quando o payload é diferente.
    """
    # Mockando dados diferentes para forçar mudança de ETag
    from app.casos_uso import ObterSobreUseCase
    from unittest.mock import AsyncMock
    
    mock_uc = AsyncMock(spec=ObterSobreUseCase)
    mock_uc.executar.return_value = {
        "nome": "Argenis",
        "titulo": "Dev",
        "localizacao": "Curitiba, PR",
        "email": "argenis@test.com",
        "telefone": "123456789",
        "github": "https://github.com/argenis",
        "linkedin": "https://linkedin.com/in/argenis",
        "descricao": {"pt": "Desc", "en": "Desc", "es": "Desc"},
        "disponibilidade": {"pt": "Sim", "en": "Yes", "es": "Sí"},
    }
    
    from app.controladores.dependencias import obter_obter_sobre_use_case
    app.dependency_overrides[obter_obter_sobre_use_case] = lambda: mock_uc
    
    try:
        resp1 = client.get("/api/v1/sobre")
        etag1 = resp1.headers.get("ETag")
        
        # Mudar o dado retornado
        mock_uc.executar.return_value = {
            "nome": "Argenis Lopez",
            "titulo": "Senior Dev",
            "localizacao": "Curitiba, PR",
            "email": "argenis@test.com",
            "telefone": "123456789",
            "github": "https://github.com/argenis",
            "linkedin": "https://linkedin.com/in/argenis",
            "descricao": {"pt": "Desc", "en": "Desc", "es": "Desc"},
            "disponibilidade": {"pt": "Sim", "en": "Yes", "es": "Sí"},
        }
        resp2 = client.get("/api/v1/sobre")
        etag2 = resp2.headers.get("ETag")
        
        assert etag1 != etag2
    finally:
        app.dependency_overrides.pop(obter_obter_sobre_use_case, None)
