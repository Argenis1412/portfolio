def test_endpoint_duplicate_repro(client):
    """
    Simula o comportamento do endpoint para múltiplas chamadas com mesmo conteúdo.
    """
    # Nota: conftest.py já reseta o DB entre testes se configurado,
    # então não precisamos mais de content_store._cache.clear()

    email = "dupe@example.com"
    content = "This belongs to a duplicate test."
    payload = {
        "nome": "Dupe User",
        "email": email,
        "assunto": "Subject A",
        "mensagem": content,
    }

    # 1. Primeira requisição (Sucesso)
    resp1 = client.post("/api/v1/contato", json=payload)
    assert resp1.status_code == 200

    # 2. Segunda requisição com MESMO conteúdo mas assunto diferente (Deve ser bloqueado)
    # A deduplicação agora é baseada apenas em email e mensagem normalizada
    payload_diff_subject = payload.copy()
    payload_diff_subject["assunto"] = "Subject B (Changed)"
    resp2 = client.post("/api/v1/contato", json=payload_diff_subject)

    assert resp2.status_code == 400
    assert resp2.json()["erro"]["codigo"] == "CONTEUDO_DUPLICADO"


def test_endpoint_rate_limit_manual_repro(client):
    """
    Verifica que o rate limit manual não bloqueia duplicatas de contar.
    """
    email = "limit@example.com"
    payload = {"nome": "Limit User", "email": email, "mensagem": "Fresh message 1"}

    # 1. Enviar normal (OK)
    resp1 = client.post("/api/v1/contato", json=payload)
    assert resp1.status_code == 200

    # 2. Enviar duplicado (Deve ser 400)
    resp2 = client.post("/api/v1/contato", json=payload)
    assert resp2.status_code == 400
