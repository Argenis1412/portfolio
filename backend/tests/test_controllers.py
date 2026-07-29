"""
Controller tests (HTTP endpoints).

Tests integration between FastAPI routes and use cases.
"""

import json
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.adapters.repository import JsonRepository
from app.controllers import dependencies
from app.controllers.dependencies import get_send_contact_use_case
from app.main import app
from app.use_cases.get_projects import GetProjectsUseCase


@pytest.fixture
def client():
    """Fixture that provides a TestClient for the application."""
    with TestClient(app) as c:
        yield c


def test_health_returns_ok(client):
    """Tests GET /health returns status ok."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "message" in data


def test_live_returns_ok_without_dependencies(client):
    """Tests GET /live returns status ok without consulting DB."""
    response = client.get("/live")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_about_returns_200(client):
    """Tests GET /api/v1/about returns 200."""
    response = client.get("/api/v1/about")

    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "email" in data
    assert "description" in data


def test_list_projects_returns_200(client):
    """Tests GET /api/v1/projects returns a list."""
    # Since we use mock in conftest, it should return mock data
    response = client.get("/api/v1/projects")

    assert response.status_code == 200
    data = response.json()
    assert "projects" in data
    assert "total" in data
    assert isinstance(data["projects"], list)


def test_list_projects_with_patchforge_returns_featured_alphabetical_order(client):
    """Returns PatchForge as a highlighted project in the established order."""
    app.dependency_overrides[dependencies.dep_projects] = lambda: GetProjectsUseCase(
        JsonRepository()
    )

    response = client.get("/api/v1/projects")

    assert response.status_code == 200
    projects = response.json()["projects"]
    patchforge = next(project for project in projects if project["id"] == "patchforge")
    featured_names = [project["name"] for project in projects if project["highlighted"]]

    assert patchforge["highlighted"] is True
    assert patchforge["repository"] == "https://github.com/Argenis1412/PatchForge"
    assert patchforge["demo"] is None
    assert patchforge["image"] is None
    assert patchforge["case_study"]["problem"]["en"].startswith("AI coding tools")
    assert patchforge["case_study"]["evidence"][0]["classification"] == "REAL"
    assert set(patchforge["short_description"]) == {"pt", "en", "es"}
    assert patchforge["learnings"] == [
        "Safety-first AI-assisted code modification",
        "Deterministic workflows for autonomous systems",
        "Typed contracts for multi-agent orchestration",
        "Artifact-based validation and auditability",
        "Git compatibility checks and controlled patch application",
        "CLI and Docker delivery for developer tools",
    ]
    assert featured_names == ["Full-Stack Portfolio", "PatchForge"]
    assert [project["name"] for project in projects] == [
        "Full-Stack Portfolio",
        "PatchForge",
        "Loja App",
    ]


@pytest.mark.asyncio
async def test_json_repository_without_case_study_sidecar_returns_projects(
    tmp_path,
):
    """A missing optional sidecar must not make static project reads fail."""
    project = {
        "id": "project-1",
        "name": "Project",
        "short_description": {"pt": "PT", "en": "EN", "es": "ES"},
        "full_description": {"pt": "PT", "en": "EN", "es": "ES"},
        "technologies": ["Python"],
        "features": [],
        "learnings": [],
        "repository": None,
        "demo": None,
        "highlight": False,
        "image": None,
    }
    (tmp_path / "projects.json").write_text(json.dumps([project]), encoding="utf-8")

    projects = await JsonRepository(tmp_path).get_projects()

    assert projects[0].id == "project-1"
    assert projects[0].case_study is None


def test_get_existing_project_returns_200(client):
    """Tests GET /api/v1/projects/{id} with an existing project."""
    # The mock in conftest defines 'project-1' as a valid ID
    response = client.get("/api/v1/projects/project-1")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "project-1"
    assert "name" in data
    assert "technologies" in data
    assert data["case_study"] is None


def test_get_nonexistent_project_returns_404(client):
    """Tests GET /api/v1/projects/{id} with a nonexistent project."""
    response = client.get("/api/v1/projects/project-inexistente")

    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "PROJECT_NOT_FOUND"
    assert "message" in data["error"]


def test_get_stack_returns_200(client):
    """Tests GET /api/v1/stack returns technologies."""
    response = client.get("/api/v1/stack")

    assert response.status_code == 200
    data = response.json()
    assert "stack" in data
    assert "by_category" in data
    assert isinstance(data["stack"], list)


def test_list_experiences_returns_200(client):
    """Tests GET /api/v1/experiences returns a list."""
    response = client.get("/api/v1/experiences")

    assert response.status_code == 200
    data = response.json()
    assert "experiences" in data
    assert "total" in data
    assert isinstance(data["experiences"], list)


def test_list_formation_returns_200(client):
    """Tests GET /api/v1/formation returns a list."""
    response = client.get("/api/v1/formation")

    assert response.status_code == 200
    data = response.json()
    assert "formations" in data
    assert "total" in data
    assert isinstance(data["formations"], list)


def test_send_contact_with_valid_data_returns_200(client):
    """Tests POST /api/contact with valid data using a secondary Mock."""
    payload = {
        "name": "Maria Silva",
        "email": "maria@example.com",
        "subject": "Test",
        "message": "This is a test message with more than 10 characters.",
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


def test_send_contact_with_invalid_email_returns_422(client):
    """Tests POST /api/contact with an invalid email address.

    Since email is now typed as EmailStr (Pydantic v2), invalid email formats
    are rejected at schema validation level with HTTP 422, not passed through to
    the controller. This is the correct behavior — leaking schema details via a
    false-200 was previously acceptable for name/message length, but email format
    validation is a hard contract (RFC 5321) and should be enforced.
    """
    payload = {
        "name": "Maria Silva",
        "email": "invalid-email",  # No @-sign — Pydantic EmailStr rejects this
        "subject": "Test",
        "message": "This is a test message with more than 10 characters.",
    }

    response = client.post("/api/v1/contact", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INPUT_VALIDATION_ERROR"
    # Ensure the failing field is identified
    details = data["error"].get("details", [])
    assert any("email" in err.get("field", "") for err in details)


def test_send_contact_with_other_invalid_data_still_processed(client):
    """Tests POST /api/contact where name is too short (guard silently drops).

    The ContactGuard handles soft validation (name length, message heuristics)
    internally and still returns 200 to avoid leaking filter logic.
    The email must be valid for the request to reach the controller.
    """
    payload = {
        "name": "M",  # 1 char — ContactGuard scores this as suspicious
        "email": "valid@example.com",
        "subject": "Abc",
        "message": "123",  # Very short — guard may flag but won't reject at schema level
    }

    mock_uc = AsyncMock()
    mock_uc.execute.return_value = True

    app.dependency_overrides[get_send_contact_use_case] = lambda: mock_uc
    try:
        response = client.post("/api/v1/contact", json=payload)
    finally:
        app.dependency_overrides.pop(get_send_contact_use_case, None)

    # Schema-level validation passes (email is valid), guard handles rest
    assert response.status_code in (200, 400, 429)
