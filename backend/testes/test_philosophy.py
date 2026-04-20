import pytest

from app.adaptadores.repositorio import RepositorioJSON


def test_api_philosophy_retorna_200_e_formato_valido(client) -> None:
    """Verifies the /api/v1/philosophy endpoint returns 200 OK and valid JSON schema."""
    response = client.get("/api/v1/philosophy")

    assert response.status_code == 200
    dados = response.json()

    assert "inspirations" in dados
    assert "total" in dados
    assert dados["total"] > 0
    assert len(dados["inspirations"]) == dados["total"]

    # Verify multi-lang schema of the first item
    first = dados["inspirations"][0]
    assert "id" in first
    assert "name" in first
    assert "role" in first
    assert "description" in first
    assert "image_url" in first

    # Check languages
    assert "en" in first["role"]
    assert "es" in first["role"]
    assert "pt" in first["role"]
    assert "en" in first["description"]


@pytest.mark.asyncio
async def test_repositorio_json_get_philosophy_parseia_corretamente() -> None:
    """Verifies that the JSON repository correctly parses the data into domain entities."""
    repo = RepositorioJSON()
    inspirations = await repo.get_philosophy()

    assert len(inspirations) > 0
    first = inspirations[0]

    assert first.id
    assert first.name
    assert isinstance(first.role, dict)
    assert isinstance(first.description, dict)
    assert first.image_url
