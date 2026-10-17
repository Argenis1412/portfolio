"""Freeze the public JSON contract before changing repository/schema mappings."""

import json
from pathlib import Path

import pytest

from app.controllers import dependencies
from app.main import app

SNAPSHOT_PATH = Path(__file__).parent / "snapshots" / "content.json"


@pytest.fixture
def json_content_client(override_dependencies, client):
    """Use production JSON providers instead of the global mock content overrides."""
    providers = (
        dependencies.dep_about,
        dependencies.dep_projects,
        dependencies.dep_project_by_id,
        dependencies.dep_stack,
        dependencies.dep_experiences,
        dependencies.dep_formation,
        dependencies.dep_philosophy,
    )
    for provider in providers:
        app.dependency_overrides.pop(provider, None)
    return client


@pytest.mark.parametrize(
    "endpoint",
    [
        "about",
        "projects",
        "projects/portfolio-api",
        "projects/patchforge",
        "projects/loja-app",
        "stack",
        "experiences",
        "formation",
        "philosophy",
    ],
)
def test_content_matches_snapshot(json_content_client, endpoint):
    expected = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))

    response = json_content_client.get(f"/api/v1/{endpoint}")

    assert response.status_code == 200
    assert response.json() == expected[endpoint]
