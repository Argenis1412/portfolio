from app.principal import app


def test_etag_and_304_not_modified(client):
    """
    Testa se o backend gera ETags e responde com 304 quando o conteúdo não mudou.
    """
    # 1. First request to obtain ETag
    resp1 = client.get("/api/v1/sobre")
    assert resp1.status_code == 200
    etag = resp1.headers.get("ETag")
    assert etag is not None
    assert resp1.headers.get("Cache-Control") is not None

    # 2. Segunda requisição enviando If-None-Match
    resp2 = client.get("/api/v1/sobre", headers={"If-None-Match": etag})

    # Should return 304 Not Modified
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
    # Mocking different data to force ETag change
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

    from app.controladores.dependencias import dep_sobre

    app.dependency_overrides[dep_sobre] = lambda: mock_uc

    try:
        resp1 = client.get("/api/v1/sobre")
        etag1 = resp1.headers.get("ETag")

        # Change returned data
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
        app.dependency_overrides.pop(dep_sobre, None)
