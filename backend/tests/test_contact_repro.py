def test_endpoint_duplicate_repro(client):
    """
    Simula o comportamento do endpoint para múltiplas chamadas com mesmo conteúdo.
    """
    # Nota: conftest.py já reseta o DB entre testes se configurado,
    # então não precisamos mais de content_store._cache.clear()

    email = "dupe@example.com"
    content = "This belongs to a duplicate test."
    payload = {
        "name": "Dupe User",
        "email": email,
        "subject": "Subject A",
        "message": content,
    }

    # 1. Primeira requisição (Sucesso)
    resp1 = client.post("/api/v1/contact", json=payload)
    assert resp1.status_code == 200

    # 2. Segunda requisição com MESMO conteúdo mas assunto diferente (Deve ser bloqueado)
    # A deduplicação agora é baseada apenas em email e message normalizada
    payload_diff_subject = payload.copy()
    payload_diff_subject["subject"] = "Subject B (Changed)"
    resp2 = client.post("/api/v1/contact", json=payload_diff_subject)

    assert resp2.status_code == 400
    assert resp2.json()["error"]["code"] == "DUPLICATE_CONTENT"


def test_endpoint_rate_limit_manual_repro(client):
    """
    Verifica que o rate limit manual não bloqueia duplicatas de contar.
    """
    email = "limit@example.com"
    payload = {"name": "Limit User", "email": email, "message": "Fresh message 1"}

    # 1. Enviar normal (OK)
    resp1 = client.post("/api/v1/contact", json=payload)
    assert resp1.status_code == 200

    # 2. Enviar duplicado (Deve ser 400)
    resp2 = client.post("/api/v1/contact", json=payload)
    assert resp2.status_code == 400
