"""
Testes dos controladores (endpoints HTTP).

Testa integração entre rotas FastAPI e casos de uso.
"""

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.controllers.dependencies import get_send_contact_use_case
from app.principal import app


@pytest.fixture
def client():
    """Fixture para fornecer um TestClient da aplicação."""
    with TestClient(app) as c:
        yield c


def test_health_retorna_ok(client):
    """Testa endpoint GET /health retorna status ok."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "message" in data


def test_live_retorna_ok_sem_dependencies(client):
    """Testa endpoint GET /live retorna status ok sem consultar DB."""
    response = client.get("/live")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_about_retorna_200(client):
    """Testa endpoint GET /api/v1/about retorna 200."""
    response = client.get("/api/v1/about")

    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "email" in data
    assert "description" in data


def test_listar_projects_retorna_200(client):
    """Testa endpoint GET /api/v1/projects retorna lista."""
    # Since we use mock in conftest, it should return mock data
    response = client.get("/api/v1/projects")

    assert response.status_code == 200
    data = response.json()
    assert "projects" in data
    assert "total" in data
    assert isinstance(data["projects"], list)


def test_obter_project_existente_retorna_200(client):
    """Testa GET /api/v1/projects/{id} com project existente."""
    # The mock in conftest defines 'project-1' as a valid ID
    response = client.get("/api/v1/projects/project-1")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "project-1"
    assert "name" in data
    assert "technologies" in data


def test_obter_project_inexistente_retorna_404(client):
    """Testa GET /api/v1/projects/{id} com project inexistente."""
    response = client.get("/api/v1/projects/project-inexistente")

    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "PROJECT_NOT_FOUND"
    assert "message" in data["error"]


def test_get_stack_retorna_200(client):
    """Testa endpoint GET /api/v1/stack retorna tecnologias."""
    response = client.get("/api/v1/stack")

    assert response.status_code == 200
    data = response.json()
    assert "stack" in data
    assert "by_category" in data
    assert isinstance(data["stack"], list)


def test_listar_experiences_retorna_200(client):
    """Testa endpoint GET /api/v1/experiences retorna lista."""
    response = client.get("/api/v1/experiences")

    assert response.status_code == 200
    data = response.json()
    assert "experiences" in data
    assert "total" in data
    assert isinstance(data["experiences"], list)


def test_listar_formation_retorna_200(client):
    """Testa endpoint GET /api/v1/formation retorna lista."""
    response = client.get("/api/v1/formation")

    assert response.status_code == 200
    data = response.json()
    assert "formations" in data
    assert "total" in data
    assert isinstance(data["formations"], list)


def test_send_contact_com_dados_validos_retorna_200(client):
    """Testa POST /api/contact com dados válidos usando Mock secundário."""
    payload = {
        "name": "Maria Silva",
        "email": "maria@example.com",
        "subject": "Teste",
        "message": "Esta é uma message de teste com mais de 10 caracteres.",
    }

    mock_uc = AsyncMock()
    mock_uc.execute.return_value = True

    app.dependency_overrides[get_send_contact_use_case] = lambda: mock_uc
    try:
        response = client.post("/api/v1/contact", json=payload)
    finally:
        app.dependency_overrides.pop(get_send_contact_use_case, None)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "message" in data
    mock_uc.execute.assert_awaited_once()


def test_send_contact_com_dados_invalidos_retorna_sucesso_falso(client):
    """
    Testa POST /api/contact com dados inválidos.
    Deve retornar 200 (Sucesso Falso) para não vazar informações about o filtro.
    """
    payload = {
        "name": "M",  # Muito curto
        "email": "email-invalido",
        "subject": "Abc",  # Muito curto
        "message": "123",  # Muito curta
    }

    response = client.post("/api/v1/contact", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "message" in data
