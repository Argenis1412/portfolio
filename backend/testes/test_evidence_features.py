import pytest
from httpx import AsyncClient, ASGITransport
from app.principal import app

@pytest.mark.anyio
async def test_chaos_monkey_simulate_429():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"X-Debug-Mode": "simulate-429"}
        response = await ac.get("/api/v1/sobre", headers=headers)
        
        assert response.status_code == 429
        assert "Retry-After" in response.headers
        data = response.json()
        assert data["erro"]["codigo"] == "RATE_LIMIT_EXCEEDED"
        assert "Simulated rate limit exceeded" in data["erro"]["mensagem"]

@pytest.mark.anyio
async def test_chaos_monkey_simulate_500():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"X-Debug-Mode": "simulate-500"}
        response = await ac.get("/api/v1/sobre", headers=headers)
        
        assert response.status_code == 500
        data = response.json()
        assert data["erro"]["codigo"] == "ERRO_INESPERADO"

@pytest.mark.anyio
async def test_metrics_summary():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/metrics/summary")
        
        assert response.status_code == 200
        data = response.json()
        assert "p95_ms" in data
        assert "requisicoes_24h" in data
        assert "taxa_erro" in data
        assert "uptime_segundos" in data

@pytest.mark.anyio
async def test_error_response_includes_trace_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Request non-existent resource
        response = await ac.get("/api/v1/invalid-resource")
        
        assert response.status_code == 404
        data = response.json()
        assert "trace_id" in data["erro"]
        assert isinstance(data["erro"]["trace_id"], str)
