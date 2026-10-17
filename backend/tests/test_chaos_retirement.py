"""Regression coverage for retiring simulation features from the public API."""

import pytest


@pytest.mark.parametrize(
    "action", ["spike", "failure", "drain", "retry", "latency", "reset"]
)
def test_simulation_endpoints_are_removed(client, action):
    assert client.post(f"/api/v1/chaos/{action}").status_code == 404


def test_simulation_routes_are_absent_from_openapi(client):
    schema = client.get("/openapi.json").json()
    assert not any("/chaos/" in path for path in schema["paths"])
    assert not any(tag["name"] == "Chaos Playground" for tag in schema.get("tags", []))


@pytest.mark.parametrize("mode", ["simulate-429", "simulate-500"])
def test_debug_header_no_longer_injects_failures(client, mode):
    response = client.get("/api/v1/about", headers={"X-Debug-Mode": mode})
    assert response.status_code == 200


@pytest.mark.parametrize(
    ("header", "status"), [("X-Chaos-Preset", 200), ("X-Debug-Mode", 400)]
)
def test_cors_accepts_only_the_temporary_frontend_header(client, header, status):
    response = client.options(
        "/api/v1/metrics/summary",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": header,
        },
    )
    assert response.status_code == status
