"""
Configurações compartilhadas de pytest.

Define fixtures reutilizáveis para testes.
"""

import pytest
from datetime import date
from unittest.mock import AsyncMock, MagicMock

from app.entidades.projeto import Projeto
from app.entidades.experiencia import ExperienciaProfissional
from app.entidades.formacao import FormacaoAcademica
from app.adaptadores.repositorio import RepositorioPortfolio
from app.adaptadores.email_adaptador import EmailAdaptador
from app.adaptadores.logger_adaptador import LoggerAdaptador
from app.principal import app
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    """Fixture para fornecer um TestClient da aplicação."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def repositorio_mock() -> RepositorioPortfolio:
    """
    Mock de RepositorioPortfolio.

    Returns:
        Mock configurado com dados de exemplo.
    """
    mock = AsyncMock(spec=RepositorioPortfolio)
    
    # Mock obter_sobre
    mock.obter_sobre.return_value = {
        "nome": "Teste Silva",
        "titulo": "Desenvolvedor",
        "localizacao": "São Paulo, SP",
        "email": "teste@example.com",
        "telefone": "(11) 99999-9999",
        "github": "https://github.com/teste",
        "linkedin": "https://linkedin.com/in/teste",
        "descricao": {"pt": "Descrição de teste", "en": "Test description", "es": "Descripción de prueba"},
        "disponibilidade": {"pt": "Remoto", "en": "Remote", "es": "Remoto"},
    }
    
    # Mock verificar_saude
    mock.verificar_saude.return_value = {"status": "ok", "detalhes": "Banco de dados Mock conectado"}
    
    # Mock obter_projetos
    mock.obter_projetos.return_value = [
        Projeto(
            id="projeto-1",
            nome="Projeto A",
            descricao_curta={"pt": "Projeto em destaque", "en": "Featured project", "es": "Proyecto destacado"},
            descricao_completa={"pt": "Descrição completa A", "en": "Full description A", "es": "Descripción completa A"},
            tecnologias=["Python"],
            funcionalidades=["Feature 1"],
            aprendizados=["Aprendizado 1"],
            repositorio="https://github.com/test/a",
            demo=None,
            destaque=True,
            imagem=None,
        ),
        Projeto(
            id="projeto-2",
            nome="Projeto B",
            descricao_curta={"pt": "Projeto normal", "en": "Normal project", "es": "Proyecto normal"},
            descricao_completa={"pt": "Descrição completa B", "en": "Full description B", "es": "Descripción completa B"},
            tecnologias=["JavaScript"],
            funcionalidades=["Feature 2"],
            aprendizados=["Aprendizado 2"],
            repositorio=None,
            demo=None,
            destaque=False,
            imagem=None,
        ),
    ]
    
    # Mock obter_projeto_por_id
    def obter_por_id(projeto_id: str):
        projetos = {
            "projeto-1": mock.obter_projetos.return_value[0],
            "projeto-2": mock.obter_projetos.return_value[1],
        }
        return projetos.get(projeto_id)
    
    mock.obter_projeto_por_id.side_effect = obter_por_id
    
    # Mock obter_stack
    mock.obter_stack.return_value = [
        {"nome": "Python", "categoria": "backend", "nivel": 4, "icone": "python"},
        {"nome": "React", "categoria": "frontend", "nivel": 3, "icone": "react"},
    ]
    
    # Mock obter_experiencias
    mock.obter_experiencias.return_value = [
        ExperienciaProfissional(
            id="exp-1",
            cargo="Dev Atual",
            empresa="Empresa A",
            localizacao="Remoto",
            data_inicio=date(2023, 1, 1),
            data_fim=None,
            descricao={"pt": "Trabalho atual", "en": "Current job", "es": "Trabajo actual"},
            tecnologias=["Python"],
            atual=True,
        ),
        ExperienciaProfissional(
            id="exp-2",
            cargo="Dev Anterior",
            empresa="Empresa B",
            localizacao="São Paulo",
            data_inicio=date(2022, 1, 1),
            data_fim=date(2022, 12, 31),
            descricao={"pt": "Trabalho anterior", "en": "Previous job", "es": "Trabajo anterior"},
            tecnologias=["Java"],
            atual=False,
        ),
    ]
    
    # Mock obter_formacao
    mock.obter_formacao.return_value = [
        FormacaoAcademica(
            id="edu-001",
            curso={"pt": "Tecnologia em Análise e Desenvolvimento de Sistemas", "en": "Associate's Degree in Systems Analysis", "es": "Tecnólogo en Análisis y Desarrollo"},
            instituicao="UFPR – Universidade Federal do Paraná",
            localizacao="Curitiba, PR",
            data_inicio=date(2026, 2, 1),
            data_fim=date(2029, 3, 6),
            descricao={"pt": "Em curso.", "en": "In progress.", "es": "En curso."},
            atual=True,
        ),
    ]

    return mock


@pytest.fixture(scope="session")
def setup_database():
    """
    Cria e inicializa um banco SQLite temporário para a sessão de testes.
    """
    import tempfile
    import os
    from sqlmodel import SQLModel, create_engine, Session
    from app.adaptadores.modelos_sql import SobreModelo, ProjetoModelo, ExperienciaModelo, FormacaoModelo, StackModelo
    import json

    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    
    sync_url = f"sqlite:///{db_path}"
    async_url = f"sqlite+aiosqlite:///{db_path}"
    
    engine = create_engine(sync_url)
    SQLModel.metadata.create_all(engine)
    
    # Popular dados mínimos para os testes de integração passarem
    with Session(engine) as session:
        session.add(SobreModelo(
            nome="Teste Silva",
            titulo="Desenvolvedor",
            localizacao="São Paulo, SP",
            email="teste@example.com",
            telefone="(11) 99999-9999",
            github="https://github.com/teste",
            linkedin="https://linkedin.com/in/teste",
            descricao=json.dumps({"pt": "Descrição", "en": "Description", "es": "Descripción"}),
            disponibilidade=json.dumps({"pt": "Remoto", "en": "Remote", "es": "Remoto"}),
        ))
        
        session.add(ProjetoModelo(
            id="projeto-1",
            nome="Projeto A",
            descricao_curta=json.dumps({"pt": "Curta", "en": "Short", "es": "Corta"}),
            descricao_completa=json.dumps({"pt": "Longa", "en": "Long", "es": "Larga"}),
            tecnologias=json.dumps(["Python"]),
            funcionalidades=json.dumps([]),
            aprendizados=json.dumps([]),
            repositorio="https://github.com/teste/a",
            demo=None,
            destaque=True,
            imagem=None
        ))
        
        session.add(StackModelo(nome="Python", categoria="backend", nivel=4, icone="python"))
        
        session.add(ExperienciaModelo(
            id="exp-1",
            cargo=json.dumps({"pt": "Dev", "en": "Dev", "es": "Dev"}),
            empresa="Empresa",
            localizacao="Remoto",
            data_inicio=date(2023, 1, 1),
            data_fim=None,
            descricao=json.dumps({"pt": "Desc", "en": "Desc", "es": "Desc"}),
            tecnologias=json.dumps(["Python"]),
            atual=True
        ))
        
        session.add(FormacaoModelo(
            id="edu-1",
            curso=json.dumps({"pt": "Curso", "en": "Course", "es": "Curso"}),
            instituicao="Uni",
            localizacao="SP",
            data_inicio=date(2020, 1, 1),
            data_fim=date(2023, 1, 1),
            descricao=json.dumps({"pt": "Fim", "en": "End", "es": "Fin"}),
            atual=False
        ))
        
        session.commit()
    
    yield async_url
    
    try:
        os.unlink(db_path)
    except OSError:
        pass


@pytest.fixture
def email_adaptador_mock() -> EmailAdaptador:
    """
    Mock de EmailAdaptador.

    Returns:
        Mock configurado para simular envio de emails.
    """
    mock = AsyncMock(spec=EmailAdaptador)
    mock.enviar_mensagem.return_value = True
    return mock


@pytest.fixture
def logger_mock() -> LoggerAdaptador:
    """
    Mock de LoggerAdaptador.

    Returns:
        Mock configurado para capturar logs.
    """
    mock = MagicMock(spec=LoggerAdaptador)
    return mock


@pytest.fixture(autouse=True)
def reset_global_state():
    """
    Reseta o estado global (Rate Limiter, Idempotency) antes de cada teste.
    Isso evita que testes acumulem limites ou cache uns dos outros.
    """
    from app.core.idempotencia import store
    from app.core.limite import limiter
    from app.core.spam_store import spam_dedup_store
    
    # Limpar caches de idempotência
    if hasattr(store, "_cache"):
        store._cache.clear()
        
    # Limpar storage do rate limiter (slowapi)
    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
        # Para MemoryStorage do limits, que o slowapi usa
        limiter._storage.storage.clear()
    elif hasattr(limiter, "_storage"):
        # Tentativa genérica caso a estrutura mude
        try:
            limiter._storage.clear()
        except TypeError:
            # Se clear() pedir argumentos, ignoramos ou tentamos outra forma
            pass

    if hasattr(spam_dedup_store, "_memory_store"):
        spam_dedup_store._memory_store.clear()


@pytest.fixture(autouse=True)
async def override_dependencias(setup_database):
    """
    Sobrescreve dependências do FastAPI para usar o banco temporário real.
    Limpa o cache dos providers para garantir que o novo RepoSQL seja usado.
    """
    from app.adaptadores.repositorio_sql import RepositorioSQL
    from app.controladores import dependencias
    from app.casos_uso import (
        ObterSobreUseCase, ObterProjetosUseCase, ObterProjetoPorIdUseCase,
        ObterStackUseCase, ObterExperienciasUseCase, ObterFormacaoUseCase
    )
    from sqlalchemy import text
    
    repo_real_test = RepositorioSQL(database_url=setup_database)
    
    # Limpar tabela de spam para cada teste para garantir isolamento
    async with repo_real_test.session_factory() as session:
        await session.exec(text("DELETE FROM spam_filter"))
        await session.commit()
    
    # Sobrescrever providers individuais
    app.dependency_overrides[dependencias.obter_repositorio] = lambda: repo_real_test
    
    app.dependency_overrides[dependencias.obter_obter_sobre_use_case] = \
        lambda: ObterSobreUseCase(repo_real_test)
        
    app.dependency_overrides[dependencias.obter_obter_projetos_use_case] = \
        lambda: ObterProjetosUseCase(repo_real_test)
        
    app.dependency_overrides[dependencias.obter_obter_projeto_por_id_use_case] = \
        lambda: ObterProjetoPorIdUseCase(repo_real_test)
        
    app.dependency_overrides[dependencias.obter_obter_stack_use_case] = \
        lambda: ObterStackUseCase(repo_real_test)
        
    app.dependency_overrides[dependencias.obter_obter_experiencias_use_case] = \
        lambda: ObterExperienciasUseCase(repo_real_test)
        
    app.dependency_overrides[dependencias.obter_obter_formacao_use_case] = \
        lambda: ObterFormacaoUseCase(repo_real_test)
    
    # Mock para envio de email para evitar chamadas reais (Formspree) nos testes
    from app.casos_uso.enviar_contato import EnviarContatoUseCase
    mock_email = AsyncMock(spec=EmailAdaptador)
    mock_email.enviar_mensagem.return_value = True
    mock_logger = MagicMock(spec=LoggerAdaptador)
    app.dependency_overrides[dependencias.obter_enviar_contato_use_case] = \
        lambda: EnviarContatoUseCase(mock_email, mock_logger)
    
    # Limpar caches por segurança (embora overrides devam prevalecer no FastAPI)
    dependencias.obter_repositorio.cache_clear()
    dependencias.obter_obter_sobre_use_case.cache_clear()
    dependencias.obter_obter_projetos_use_case.cache_clear()
    dependencias.obter_obter_projeto_por_id_use_case.cache_clear()
    dependencias.obter_obter_stack_use_case.cache_clear()
    dependencias.obter_obter_experiencias_use_case.cache_clear()
    dependencias.obter_obter_formacao_use_case.cache_clear()
    
    yield
    app.dependency_overrides.clear()
