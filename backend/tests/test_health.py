"""Health probes use local portfolio files and never require a database."""

import json
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from app.adapters.repository import JsonRepository
from app.controllers.dependencies import get_static_repository
from app.main import app
from app.settings import settings

REQUIRED_FILES = {
    "about.json": {},
    "projects.json": [],
    "stack.json": [],
    "experiences.json": [],
    "formation.json": [],
    "philosophy.json": [],
}


@pytest.fixture
def data_directory(tmp_path):
    for filename, content in REQUIRED_FILES.items():
        (tmp_path / filename).write_text(json.dumps(content), encoding="utf-8")
    return tmp_path


@pytest.fixture
def health_repository(client, data_directory):
    repo = JsonRepository(data_directory)
    app.dependency_overrides[get_static_repository] = lambda: repo
    return repo


@pytest.mark.parametrize("api_key", ["", "test-key-never-sent"])
def test_health_reports_json_and_email_configuration(
    client, health_repository, monkeypatch, api_key
):
    monkeypatch.setattr(settings, "resend_api_key", api_key)
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["details"] == {
        "data": "ok",
        "email": "configured" if api_key else "pending",
        "data_details": dict.fromkeys(REQUIRED_FILES, "ok"),
    }
    assert "test-key-never-sent" not in response.text


@pytest.mark.parametrize("filename", REQUIRED_FILES)
def test_health_is_degraded_when_a_required_file_is_missing(
    client, health_repository, data_directory, filename
):
    (data_directory / filename).unlink()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert response.json()["details"]["data_details"][filename] == "missing"


@pytest.mark.parametrize("content", [b"{broken", b"\xff", b"[]"])
def test_health_detects_invalid_json_even_after_content_was_cached(
    client, health_repository, data_directory, content
):
    health_repository._cache["about.json"] = {"name": "Cached valid content"}
    (data_directory / "about.json").write_bytes(content)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert response.json()["details"]["data_details"]["about.json"] == "invalid"


def test_health_handles_unreadable_json(
    client, health_repository, data_directory, monkeypatch
):
    original_open = Path.open

    def open_file(path, *args, **kwargs):
        if path == data_directory / "about.json":
            raise PermissionError("Private filesystem detail")
        return original_open(path, *args, **kwargs)

    monkeypatch.setattr(Path, "open", open_file)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert response.json()["details"]["data_details"]["about.json"] == "unreadable"
    assert "Private filesystem detail" not in response.text


def test_optional_case_studies_are_checked_when_present(
    client, health_repository, data_directory
):
    sidecar = data_directory / "project_case_studies.json"
    sidecar.write_text("{}", encoding="utf-8")
    assert client.get("/health").json()["status"] == "ok"

    sidecar.write_text("{broken", encoding="utf-8")
    response = client.get("/health")
    assert response.json()["status"] == "degraded"
    assert response.json()["details"]["data_details"][sidecar.name] == "invalid"


def test_liveness_does_not_check_portfolio_files(client, health_repository):
    health_repository.check_health = AsyncMock(side_effect=RuntimeError("Unavailable"))

    assert client.get("/live").status_code == 200
    health_repository.check_health.assert_not_awaited()
