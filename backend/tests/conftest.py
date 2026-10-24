"""
Shared pytest configurations.

Defines reusable fixtures for tests.
"""

import os

# Isolate external services BEFORE any app imports.
os.environ["REDIS_URL"] = "memory://"
os.environ["WORKER_ENABLED"] = "false"
os.environ["OTEL_ENABLED"] = "false"
os.environ["SENTRY_DSN"] = ""

from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.adapters.email_adapter import EmailAdapter
from app.adapters.logger_adapter import LoggerAdapter
from app.adapters.repository import PortfolioRepository
from app.entities.experience import ProfessionalExperience
from app.entities.formation import AcademicFormation
from app.entities.project import Project
from app.main import app


@pytest.fixture
def client():
    """Fixture to provide an application TestClient."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def repository_mock() -> PortfolioRepository:
    """
    Mock of PortfolioRepository.

    Returns:
        Mock configured with sample data.
    """
    mock = AsyncMock(spec=PortfolioRepository)

    # Mock get_about
    mock.get_about.return_value = {
        "name": "Test Silva",
        "title": "Developer",
        "location": "São Paulo, SP",
        "email": "test@example.com",
        "phone": "(11) 99999-9999",
        "github": "https://github.com/test",
        "linkedin": "https://linkedin.com/in/test",
        "description": {
            "pt": "Descrição de teste",
            "en": "Test description",
            "es": "Descripción de prueba",
        },
        "availability": {"pt": "Remoto", "en": "Remote", "es": "Remoto"},
    }

    # Mock get_projects
    mock.get_projects.return_value = [
        Project(
            id="project-1",
            name="Project A",
            short_description={
                "pt": "Project em destaque",
                "en": "Featured project",
                "es": "Proyecto destacado",
            },
            full_description={
                "pt": "Descrição completa A",
                "en": "Full description A",
                "es": "Descripción completa A",
            },
            technologies=["Python"],
            features=["Feature 1"],
            learnings=["Learning 1"],
            repository="https://github.com/test/a",
            demo=None,
            highlighted=True,
            image=None,
        ),
        Project(
            id="project-2",
            name="Project B",
            short_description={
                "pt": "Project normal",
                "en": "Normal project",
                "es": "Proyecto normal",
            },
            full_description={
                "pt": "Descrição completa B",
                "en": "Full description B",
                "es": "Descripción completa B",
            },
            technologies=["JavaScript"],
            features=["Feature 2"],
            learnings=["Learning 2"],
            repository=None,
            demo=None,
            highlighted=False,
            image=None,
        ),
    ]

    # Mock get_project_by_id
    def get_by_id(project_id: str):
        projects = {
            "project-1": mock.get_projects.return_value[0],
            "project-2": mock.get_projects.return_value[1],
        }
        return projects.get(project_id)

    mock.get_project_by_id.side_effect = get_by_id

    # Mock get_stack
    mock.get_stack.return_value = [
        {"name": "Python", "category": "backend", "level": 4, "icon": "python"},
        {"name": "React", "category": "frontend", "level": 3, "icon": "react"},
    ]

    # Mock get_experiences
    mock.get_experiences.return_value = [
        ProfessionalExperience(
            id="exp-1",
            role={"en": "Current Dev", "pt": "Dev Atual", "es": "Dev Actual"},
            company="Company A",
            location="Remote",
            start_date=date(2023, 1, 1),
            end_date=None,
            description={
                "pt": "Trabalho atual",
                "en": "Current job",
                "es": "Trabajo actual",
            },
            technologies=["Python"],
            current=True,
        ),
        ProfessionalExperience(
            id="exp-2",
            role={"en": "Former Dev", "pt": "Dev Antigo", "es": "Dev Anterior"},
            company="Company B",
            location="São Paulo",
            start_date=date(2022, 1, 1),
            end_date=date(2022, 12, 31),
            description={
                "pt": "Trabalho anterior",
                "en": "Previous job",
                "es": "Trabajo anterior",
            },
            technologies=["Java"],
            current=False,
        ),
    ]

    # Mock get_formation
    mock.get_formation.return_value = [
        AcademicFormation(
            id="edu-001",
            course={
                "pt": "Tecnologia em Análise e Desenvolvimento de Sistemas",
                "en": "Associate's Degree in Systems Analysis",
                "es": "Tecnólogo en Análisis y Desarrollo",
            },
            institution="UFPR – Universidade Federal do Paraná",
            location="Curitiba, PR",
            start_date=date(2026, 2, 1),
            end_date=date(2029, 3, 6),
            description={"pt": "Em curso.", "en": "In progress.", "es": "En curso."},
            current=True,
        ),
    ]

    return mock


@pytest.fixture
def email_adapter_mock() -> EmailAdapter:
    """
    Mock of EmailAdapter.

    Returns:
        Mock configured to simulate email sending.
    """
    mock = AsyncMock(spec=EmailAdapter)
    mock.send_message.return_value = True
    return mock


@pytest.fixture
def logger_mock() -> LoggerAdapter:
    """
    Mock of LoggerAdapter.

    Returns:
        Mock configured to capture logs.
    """
    mock = MagicMock(spec=LoggerAdapter)
    return mock


@pytest.fixture(autouse=True)
def reset_global_state():
    """
    Resets global state (Rate Limiter, Idempotency) before each test.
    This prevents tests from accumulating limits or cache from each other.
    """
    from app.core.idempotency import store
    from app.core.rate_limit import limiter, _fallback_limiter
    from app.core import rate_limit

    rate_limit._redis_disabled_until = 0.0
    _fallback_limiter._storage.reset()
    from app.core.spam_store import spam_dedup_store

    # Clear idempotency caches
    if hasattr(store, "_cache"):
        store._cache.clear()

    # Clear rate limiter storage (slowapi)
    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
        storage_obj = limiter._storage.storage
        # MemoryStorage uses a dict
        if isinstance(storage_obj, dict):
            storage_obj.clear()

    if hasattr(spam_dedup_store, "_memory_store"):
        spam_dedup_store._memory_store.clear()


@pytest.fixture(autouse=True)
def override_dependencies(repository_mock):
    """
    Override content providers and email delivery with isolated test doubles.
    """
    from app.use_cases import (
        GetExperiencesUseCase,
        GetFormationUseCase,
        GetProjectByIdUseCase,
        GetProjectsUseCase,
        GetAboutUseCase,
        GetStackUseCase,
    )
    from app.controllers import dependencies

    repo = repository_mock

    app.dependency_overrides[dependencies.dep_about] = lambda: GetAboutUseCase(repo)

    app.dependency_overrides[dependencies.dep_projects] = lambda: GetProjectsUseCase(
        repo
    )

    app.dependency_overrides[dependencies.dep_project_by_id] = lambda: (
        GetProjectByIdUseCase(repo)
    )

    app.dependency_overrides[dependencies.dep_stack] = lambda: GetStackUseCase(repo)

    app.dependency_overrides[dependencies.dep_experiences] = lambda: (
        GetExperiencesUseCase(repo)
    )

    app.dependency_overrides[dependencies.dep_formation] = lambda: GetFormationUseCase(
        repo
    )

    # Mock for email sending to avoid real calls in tests
    from app.use_cases.send_contact import SendContactUseCase

    mock_email = AsyncMock(spec=EmailAdapter)
    mock_email.send_message.return_value = True
    mock_logger = MagicMock(spec=LoggerAdapter)
    app.dependency_overrides[dependencies.get_send_contact_use_case] = lambda: (
        SendContactUseCase(mock_email, mock_logger)
    )

    # Clear caches for safety
    dependencies.dep_about.cache_clear()
    dependencies.dep_projects.cache_clear()
    dependencies.dep_project_by_id.cache_clear()
    dependencies.dep_stack.cache_clear()
    dependencies.dep_experiences.cache_clear()
    dependencies.dep_formation.cache_clear()

    yield
    app.dependency_overrides.clear()
