"""
Testes de integração do RepositorioSQL.

Usa um banco SQLite em arquivo temporário para testar as queries reais,
a serialização manual de JSON e o comportamento do repositório.

Por que arquivo temporário e não :memory:?
- O RepositorioSQL usa um engine assíncrono (aiosqlite).
- O codigo de setup usa um engine síncrono para semear os dados.
- SQLite só compartilha :memory: entre conexões da mesma thread,
  por isso usamos um arquivo temporário que ambos os engines conseguem ler.
"""

import os
import tempfile
from datetime import date

import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.adaptadores.modelos_sql import (
    ExperienciaModelo,
    FormacaoModelo,
    ProjetoModelo,
    SobreModelo,
    StackModelo,
)
from app.adaptadores.repositorio_sql import RepositorioSQL

# ─── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture(scope="function")
def repo_com_dados():
    """
    Cria um RepositorioSQL com banco SQLite temporário populado com dados de teste.
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
        yield RepositorioSQL(database_url=async_url)

    finally:
        # Cleanup: remove temporary file
        try:
            os.unlink(db_path)
        except OSError:
            pass


def _popular_banco(session: Session) -> None:
    """Popula o banco de teste com dados de exemplo."""

    session.add(
        SobreModelo(
            nome="Argenis Teste",
            titulo="Backend Developer",
            localizacao="Curitiba, PR",
            email="teste@example.com",
            telefone="(41) 99999-9999",
            github="https://github.com/teste",
            linkedin="https://linkedin.com/in/teste",
            descricao={
                "pt": "Descrição PT",
                "en": "Description EN",
                "es": "Descripción ES",
            },
            disponibilidade={"pt": "Remoto", "en": "Remote", "es": "Remoto"},
        )
    )

    session.add(
        ProjetoModelo(
            id="proj-test-1",
            nome="Projeto Teste",
            descricao_curta={"pt": "Curta PT", "en": "Short EN", "es": "Corta ES"},
            descricao_completa={
                "pt": "Completa PT",
                "en": "Full EN",
                "es": "Completa ES",
            },
            tecnologias=["Python", "FastAPI"],
            funcionalidades=["Feature A", "Feature B"],
            aprendizados=["Aprendizado A"],
            repositorio="https://github.com/teste/repo",
            demo=None,
            destaque=True,
            imagem=None,
        )
    )

    session.add(
        ExperienciaModelo(
            id="exp-test-1",
            cargo={"pt": "Dev Backend", "en": "Backend Dev", "es": "Dev Backend"},
            empresa="Empresa Teste",
            localizacao="Remoto",
            data_inicio=date(2024, 1, 1),
            data_fim=None,
            descricao={
                "pt": "Descrição PT",
                "en": "Description EN",
                "es": "Descripción ES",
            },
            tecnologias=["Python", "FastAPI"],
            atual=True,
        )
    )

    session.add(
        FormacaoModelo(
            id="edu-test-1",
            curso={
                "pt": "Análise de Sistemas",
                "en": "Systems Analysis",
                "es": "Análisis",
            },
            instituicao="UFPR Teste",
            localizacao="Curitiba, PR",
            data_inicio=date(2024, 2, 1),
            data_fim=date(2026, 12, 1),
            descricao={"pt": "Em andamento", "en": "In progress", "es": "En progreso"},
            atual=True,
        )
    )

    session.add(
        StackModelo(nome="Python", categoria="backend", nivel=5, icone="python")
    )
    session.add(
        StackModelo(nome="FastAPI", categoria="backend", nivel=4, icone="fastapi")
    )
    session.add(StackModelo(nome="React", categoria="frontend", nivel=3, icone="react"))


# ─── Testes: verificar_saude ───────────────────────────────────────────────────


async def test_verificar_saude_retorna_ok(repo_com_dados):
    """Health check deve retornar status 'ok' quando o banco está acessível."""
    resultado = await repo_com_dados.verificar_saude()
    assert resultado["status"] == "ok"


# ─── Testes: obter_sobre ───────────────────────────────────────────────────────


async def test_obter_sobre_retorna_dados_basicos(repo_com_dados):
    """obter_sobre deve retornar um dict com os campos do modelo."""
    resultado = await repo_com_dados.obter_sobre()

    assert isinstance(resultado, dict)
    assert resultado["nome"] == "Argenis Teste"
    assert resultado["email"] == "teste@example.com"
    assert resultado["titulo"] == "Backend Developer"


async def test_obter_sobre_deserializa_descricao(repo_com_dados):
    """O campo 'descricao' deve ser deserializado de JSON string para dict."""
    resultado = await repo_com_dados.obter_sobre()

    assert isinstance(resultado["descricao"], dict)
    assert resultado["descricao"]["pt"] == "Descrição PT"
    assert resultado["descricao"]["en"] == "Description EN"
    assert resultado["descricao"]["es"] == "Descripción ES"


async def test_obter_sobre_deserializa_disponibilidade(repo_com_dados):
    """O campo 'disponibilidade' deve ser deserializado de JSON string para dict."""
    resultado = await repo_com_dados.obter_sobre()

    assert isinstance(resultado["disponibilidade"], dict)
    assert resultado["disponibilidade"]["en"] == "Remote"


# ─── Testes: obter_projetos ────────────────────────────────────────────────────


async def test_obter_projetos_retorna_lista(repo_com_dados):
    """obter_projetos deve retornar uma lista de Projeto."""
    projetos = await repo_com_dados.obter_projetos()

    assert isinstance(projetos, list)
    assert len(projetos) == 1


async def test_obter_projetos_dados_corretos(repo_com_dados):
    """Projeto retornado deve ter os dados corretos seeded."""
    projetos = await repo_com_dados.obter_projetos()
    p = projetos[0]

    assert p.id == "proj-test-1"
    assert p.nome == "Projeto Teste"
    assert p.destaque is True
    assert p.repositorio == "https://github.com/teste/repo"
    assert p.demo is None


async def test_obter_projetos_deserializa_tecnologias(repo_com_dados):
    """O campo 'tecnologias' deve ser deserializado de JSON string para list."""
    projetos = await repo_com_dados.obter_projetos()
    p = projetos[0]

    assert isinstance(p.tecnologias, list)
    assert "Python" in p.tecnologias
    assert "FastAPI" in p.tecnologias


async def test_obter_projetos_deserializa_descricao_curta(repo_com_dados):
    """O campo 'descricao_curta' deve ser deserializado para dict localizado."""
    projetos = await repo_com_dados.obter_projetos()
    p = projetos[0]

    assert isinstance(p.descricao_curta, dict)
    assert p.descricao_curta["pt"] == "Curta PT"
    assert p.descricao_curta["en"] == "Short EN"


async def test_obter_projeto_por_id_existente(repo_com_dados):
    """Busca por ID existente deve retornar o projeto."""
    projeto = await repo_com_dados.obter_projeto_por_id("proj-test-1")

    assert projeto is not None
    assert projeto.id == "proj-test-1"
    assert projeto.nome == "Projeto Teste"


async def test_obter_projeto_por_id_inexistente(repo_com_dados):
    """Busca por ID inexistente deve retornar None."""
    projeto = await repo_com_dados.obter_projeto_por_id("id-fantasma-999")

    assert projeto is None


# ─── Testes: obter_stack ──────────────────────────────────────────────────────


async def test_obter_stack_retorna_lista(repo_com_dados):
    """obter_stack deve retornar uma lista de dicts."""
    stack = await repo_com_dados.obter_stack()

    assert isinstance(stack, list)
    assert len(stack) == 3


async def test_obter_stack_campos_corretos(repo_com_dados):
    """Cada item do stack deve ter os 4 campos esperados."""
    stack = await repo_com_dados.obter_stack()

    for item in stack:
        assert "nome" in item
        assert "categoria" in item
        assert "nivel" in item
        assert "icone" in item


async def test_obter_stack_valores_corretos(repo_com_dados):
    """Stack deve conter as tecnologias inseridas."""
    stack = await repo_com_dados.obter_stack()
    nomes = [s["nome"] for s in stack]

    assert "Python" in nomes
    assert "FastAPI" in nomes
    assert "React" in nomes


# ─── Testes: obter_experiencias ───────────────────────────────────────────────


async def test_obter_experiencias_retorna_lista(repo_com_dados):
    """obter_experiencias deve retornar uma lista de ExperienciaProfissional."""
    experiencias = await repo_com_dados.obter_experiencias()

    assert isinstance(experiencias, list)
    assert len(experiencias) == 1


async def test_obter_experiencias_deserializa_cargo(repo_com_dados):
    """O campo 'cargo' (localizado) deve ser deserializado para dict."""
    experiencias = await repo_com_dados.obter_experiencias()
    exp = experiencias[0]

    assert isinstance(exp.cargo, dict)
    assert exp.cargo["pt"] == "Dev Backend"
    assert exp.cargo["en"] == "Backend Dev"


async def test_obter_experiencias_deserializa_tecnologias(repo_com_dados):
    """O campo 'tecnologias' deve ser deserializado para list."""
    experiencias = await repo_com_dados.obter_experiencias()
    exp = experiencias[0]

    assert isinstance(exp.tecnologias, list)
    assert "Python" in exp.tecnologias


async def test_obter_experiencias_atual_true(repo_com_dados):
    """Experiência marcada como atual deve ter actual=True."""
    experiencias = await repo_com_dados.obter_experiencias()
    exp = experiencias[0]

    assert exp.atual is True
    assert exp.data_fim is None


# ─── Testes: obter_formacao ───────────────────────────────────────────────────


async def test_obter_formacao_retorna_lista(repo_com_dados):
    """obter_formacao deve retornar uma lista de FormacaoAcademica."""
    formacao = await repo_com_dados.obter_formacao()

    assert isinstance(formacao, list)
    assert len(formacao) == 1


async def test_obter_formacao_deserializa_curso(repo_com_dados):
    """O campo 'curso' (localizado) deve ser deserializado para dict."""
    formacao = await repo_com_dados.obter_formacao()
    f = formacao[0]

    assert isinstance(f.curso, dict)
    assert f.curso["pt"] == "Análise de Sistemas"
    assert f.curso["en"] == "Systems Analysis"


async def test_obter_formacao_dados_corretos(repo_com_dados):
    """Formação deve ter os dados corretos seeded."""
    formacao = await repo_com_dados.obter_formacao()
    f = formacao[0]

    assert f.id == "edu-test-1"
    assert f.instituicao == "UFPR Teste"
    assert f.atual is True
