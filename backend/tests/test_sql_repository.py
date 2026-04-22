"""
Testes de integração do SqlRepository.

Usa um banco SQLite em arquivo temporário para testar as queries reais,
a serialização manual de JSON e o comportamento do repositório.

Por que arquivo temporário e não :memory:?
- O SqlRepository usa um engine assíncrono (aiosqlite).
- O codigo de setup usa um engine síncrono para semear os dados.
- SQLite só compartilha :memory: entre conexões da mesma thread,
  por isso usamos um arquivo temporário que ambos os engines conseguem ler.
"""

import os
import tempfile
from datetime import date

import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.adapters.sql_models import (
    ExperienceModel,
    FormationModel,
    ProjectModel,
    AboutModel,
    StackModel,
)
from app.adapters.sql_repository import SqlRepository

# ─── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture(scope="function")
def repo_com_dados():
    """
    Cria um SqlRepository com banco SQLite temporário populado com dados de teste.
    O banco é destruído automaticamente ao final de cada teste.
    """
    # Create temporary file for database
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    # URLs for both engines
    sync_url = f"sqlite:///{db_path}"
    async_url = f"sqlite+aiosqlite:///{db_path}"

    try:
        # Cria tabelas e semente com engine síncrono
        sync_engine = create_engine(sync_url, connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(sync_engine)

        with Session(sync_engine) as session:
            _popular_banco(session)
            session.commit()

        # Returns async repository pointing to the same file
        yield SqlRepository(database_url=async_url)

    finally:
        # Cleanup: remove temporary file
        try:
            os.unlink(db_path)
        except OSError:
            pass


def _popular_banco(session: Session) -> None:
    """Popula o banco de teste com dados de exemplo."""

    session.add(
        AboutModel(
            name="Argenis Teste",
            title="Backend Developer",
            location="Curitiba, PR",
            email="teste@example.com",
            phone="(41) 99999-9999",
            github="https://github.com/teste",
            linkedin="https://linkedin.com/in/teste",
            description={
                "pt": "Descrição PT",
                "en": "Description EN",
                "es": "Descripción ES",
            },
            availability={"pt": "Remoto", "en": "Remote", "es": "Remoto"},
        )
    )

    session.add(
        ProjectModel(
            id="proj-test-1",
            name="Project Teste",
            short_description={"pt": "Curta PT", "en": "Short EN", "es": "Corta ES"},
            full_description={
                "pt": "Completa PT",
                "en": "Full EN",
                "es": "Completa ES",
            },
            technologies=["Python", "FastAPI"],
            features=["Feature A", "Feature B"],
            learnings=["Aprendizado A"],
            repository="https://github.com/teste/repo",
            demo=None,
            highlighted=True,
            image=None,
        )
    )

    session.add(
        ExperienceModel(
            id="exp-test-1",
            role={"pt": "Dev Backend", "en": "Backend Dev", "es": "Dev Backend"},
            company="Empresa Teste",
            location="Remoto",
            start_date=date(2024, 1, 1),
            end_date=None,
            description={
                "pt": "Descrição PT",
                "en": "Description EN",
                "es": "Descripción ES",
            },
            technologies=["Python", "FastAPI"],
            current=True,
        )
    )

    session.add(
        FormationModel(
            id="edu-test-1",
            course={
                "pt": "Análise de Sistemas",
                "en": "Systems Analysis",
                "es": "Análisis",
            },
            institution="UFPR Teste",
            location="Curitiba, PR",
            start_date=date(2024, 2, 1),
            end_date=date(2026, 12, 1),
            description={"pt": "Em andamento", "en": "In progress", "es": "En progreso"},
            current=True,
        )
    )

    session.add(
        StackModel(name="Python", category="backend", level=5, icon="python")
    )
    session.add(
        StackModel(name="FastAPI", category="backend", level=4, icon="fastapi")
    )
    session.add(StackModel(name="React", category="frontend", level=3, icon="react"))


# ─── Testes: check_health ───────────────────────────────────────────────────


async def test_check_health_retorna_ok(repo_com_dados):
    """Health check deve retornar status 'ok' quando o banco está acessível."""
    resultado = await repo_com_dados.check_health()
    assert resultado["status"] == "ok"


# ─── Testes: get_about ───────────────────────────────────────────────────────


async def test_get_about_retorna_dados_basicos(repo_com_dados):
    """get_about deve retornar um dict com os campos do modelo."""
    resultado = await repo_com_dados.get_about()

    assert isinstance(resultado, dict)
    assert resultado["name"] == "Argenis Teste"
    assert resultado["email"] == "teste@example.com"
    assert resultado["title"] == "Backend Developer"


async def test_get_about_deserializa_descricao(repo_com_dados):
    """O campo 'description' deve ser deserializado de JSON string para dict."""
    resultado = await repo_com_dados.get_about()

    assert isinstance(resultado["description"], dict)
    assert resultado["description"]["pt"] == "Descrição PT"
    assert resultado["description"]["en"] == "Description EN"
    assert resultado["description"]["es"] == "Descripción ES"


async def test_get_about_deserializa_disponibilidade(repo_com_dados):
    """O campo 'availability' deve ser deserializado de JSON string para dict."""
    resultado = await repo_com_dados.get_about()

    assert isinstance(resultado["availability"], dict)
    assert resultado["availability"]["en"] == "Remote"


# ─── Testes: get_projects ────────────────────────────────────────────────────


async def test_get_projects_retorna_lista(repo_com_dados):
    """get_projects deve retornar uma lista de Project."""
    projects = await repo_com_dados.get_projects()

    assert isinstance(projects, list)
    assert len(projects) == 1


async def test_get_projects_dados_corretos(repo_com_dados):
    """Project retornado deve ter os dados corretos seeded."""
    projects = await repo_com_dados.get_projects()
    p = projects[0]

    assert p.id == "proj-test-1"
    assert p.name == "Project Teste"
    assert p.highlighted is True
    assert p.repository == "https://github.com/teste/repo"
    assert p.demo is None


async def test_get_projects_deserializa_tecnologias(repo_com_dados):
    """O campo 'technologies' deve ser deserializado de JSON string para list."""
    projects = await repo_com_dados.get_projects()
    p = projects[0]

    assert isinstance(p.technologies, list)
    assert "Python" in p.technologies
    assert "FastAPI" in p.technologies


async def test_get_projects_deserializa_descricao_curta(repo_com_dados):
    """O campo 'short_description' deve ser deserializado para dict localizado."""
    projects = await repo_com_dados.get_projects()
    p = projects[0]

    assert isinstance(p.short_description, dict)
    assert p.short_description["pt"] == "Curta PT"
    assert p.short_description["en"] == "Short EN"


async def test_get_project_by_id_existente(repo_com_dados):
    """Busca por ID existente deve retornar o project."""
    project = await repo_com_dados.get_project_by_id("proj-test-1")

    assert project is not None
    assert project.id == "proj-test-1"
    assert project.name == "Project Teste"


async def test_get_project_by_id_inexistente(repo_com_dados):
    """Busca por ID inexistente deve retornar None."""
    project = await repo_com_dados.get_project_by_id("id-fantasma-999")

    assert project is None


# ─── Testes: get_stack ──────────────────────────────────────────────────────


async def test_get_stack_retorna_lista(repo_com_dados):
    """get_stack deve retornar uma lista de dicts."""
    stack = await repo_com_dados.get_stack()

    assert isinstance(stack, list)
    assert len(stack) == 3


async def test_get_stack_campos_corretos(repo_com_dados):
    """Cada item do stack deve ter os 4 campos esperados."""
    stack = await repo_com_dados.get_stack()

    for item in stack:
        assert "name" in item
        assert "category" in item
        assert "level" in item
        assert "icon" in item


async def test_get_stack_valores_corretos(repo_com_dados):
    """Stack deve conter as tecnologias inseridas."""
    stack = await repo_com_dados.get_stack()
    nomes = [s["name"] for s in stack]

    assert "Python" in nomes
    assert "FastAPI" in nomes
    assert "React" in nomes


# ─── Testes: get_experiences ───────────────────────────────────────────────


async def test_get_experiences_retorna_lista(repo_com_dados):
    """get_experiences deve retornar uma lista de ProfessionalExperience."""
    experiences = await repo_com_dados.get_experiences()

    assert isinstance(experiences, list)
    assert len(experiences) == 1


async def test_get_experiences_deserializa_role(repo_com_dados):
    """O campo 'role' (localizado) deve ser deserializado para dict."""
    experiences = await repo_com_dados.get_experiences()
    exp = experiences[0]

    assert isinstance(exp.role, dict)
    assert exp.role["pt"] == "Dev Backend"
    assert exp.role["en"] == "Backend Dev"


async def test_get_experiences_deserializa_technologies(repo_com_dados):
    """O campo 'technologies' deve ser deserializado para list."""
    experiences = await repo_com_dados.get_experiences()
    exp = experiences[0]

    assert isinstance(exp.technologies, list)
    assert "Python" in exp.technologies


async def test_get_experiences_current_true(repo_com_dados):
    """Experiência marcada como atual deve ter actual=True."""
    experiences = await repo_com_dados.get_experiences()
    exp = experiences[0]

    assert exp.current is True
    assert exp.end_date is None


# ─── Testes: get_formation ───────────────────────────────────────────────────


async def test_get_formation_retorna_lista(repo_com_dados):
    """get_formation deve retornar uma lista de AcademicFormation."""
    formation = await repo_com_dados.get_formation()

    assert isinstance(formation, list)
    assert len(formation) == 1


async def test_get_formation_deserializa_course(repo_com_dados):
    """O campo 'course' (localizado) deve ser deserializado para dict."""
    formation = await repo_com_dados.get_formation()
    f = formation[0]

    assert isinstance(f.course, dict)
    assert f.course["pt"] == "Análise de Sistemas"
    assert f.course["en"] == "Systems Analysis"


async def test_get_formation_dados_corretos(repo_com_dados):
    """Formação deve ter os dados corretos seeded."""
    formation = await repo_com_dados.get_formation()
    f = formation[0]

    assert f.id == "edu-test-1"
    assert f.institution == "UFPR Teste"
    assert f.current is True
