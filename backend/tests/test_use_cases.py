"""
Use case tests.

Tests business logic in isolation, without HTTP dependencies.
"""

import pytest

from app.use_cases import (
    SendContactUseCase,
    GetExperiencesUseCase,
    GetFormationUseCase,
    GetProjectByIdUseCase,
    GetProjectsUseCase,
    GetAboutUseCase,
    GetStackUseCase,
)


@pytest.mark.asyncio
async def test_get_about_returns_correct_data(repository_mock):
    """Tests that GetAboutUseCase returns data from the repository."""
    uc = GetAboutUseCase(repository_mock)

    resultado = await uc.execute()

    assert resultado["name"] == "Test Silva"
    assert resultado["email"] == "test@example.com"
    repository_mock.get_about.assert_called_once()


@pytest.mark.asyncio
async def test_get_projects_sorts_by_featured(repository_mock):
    """Tests that featured projects appear first."""
    uc = GetProjectsUseCase(repository_mock)

    projects = await uc.execute()

    assert len(projects) == 2
    assert projects[0].highlighted is True  # Featured first
    assert projects[1].highlighted is False
    repository_mock.get_projects.assert_called_once()


@pytest.mark.asyncio
async def test_get_project_by_id_found(repository_mock):
    """Tests lookup of an existing project by ID."""
    uc = GetProjectByIdUseCase(repository_mock)

    project = await uc.execute("project-1")

    assert project is not None
    assert project.id == "project-1"
    assert project.name == "Project A"


@pytest.mark.asyncio
async def test_get_project_by_id_not_found(repository_mock):
    """Tests that lookup of a nonexistent project returns None."""
    uc = GetProjectByIdUseCase(repository_mock)

    project = await uc.execute("project-inexistente")

    assert project is None


@pytest.mark.asyncio
async def test_get_stack_groups_by_category(repository_mock):
    """Tests that stack items are grouped by category."""
    uc = GetStackUseCase(repository_mock)

    resultado = await uc.execute()

    assert "backend" in resultado
    assert "frontend" in resultado
    assert len(resultado["backend"]) == 1
    assert resultado["backend"][0]["name"] == "Python"
    repository_mock.get_stack.assert_called_once()


@pytest.mark.asyncio
async def test_get_experiences_orders_chronologically(repository_mock):
    """Tests that experiences are ordered (current first)."""
    uc = GetExperiencesUseCase(repository_mock)

    experiences = await uc.execute()

    assert len(experiences) == 2
    assert experiences[0].current is True  # Current first
    assert experiences[1].current is False
    repository_mock.get_experiences.assert_called_once()


@pytest.mark.asyncio
async def test_get_formation_orders_by_current(repository_mock):
    """Tests that academic formations are returned ordered (in-progress first)."""
    uc = GetFormationUseCase(repository_mock)

    formations = await uc.execute()

    assert len(formations) == 1
    assert formations[0].current is True
    repository_mock.get_formation.assert_called_once()


@pytest.mark.asyncio
async def test_send_contact_success(email_adapter_mock, logger_mock):
    """Tests successful message sending."""
    uc = SendContactUseCase(email_adapter_mock, logger_mock)
    email_adapter_mock.send_message.return_value = True

    success = await uc.execute(
        name="Maria",
        email="maria@example.com",
        subject="Test",
        message="Test message",
    )

    assert success is True
    email_adapter_mock.send_message.assert_called_once()
    logger_mock.info.assert_called()


@pytest.mark.asyncio
async def test_send_contact_suspicious_receives_visible_warning(
    email_adapter_mock, logger_mock
):
    """Tests that suspicious emails receive a strong warning in subject and body."""
    uc = SendContactUseCase(email_adapter_mock, logger_mock)
    email_adapter_mock.send_message.return_value = True

    await uc.execute(
        name="Maria",
        email="maria@example.com",
        subject="Security review",
        message="Please click this urgent link.",
        is_suspicious=True,
        spam_score=45,
    )

    message_enviada = email_adapter_mock.send_message.call_args.args[0]
    assert message_enviada.subject.startswith("[⚠ POSSIBLE SPAM]")
    assert "--- 🛡️ SECURITY WARNING (ANTI-SPAM FILTER) ---" in message_enviada.message
    assert "Risk Level: 45/100" in message_enviada.message


@pytest.mark.asyncio
async def test_send_contact_fails(email_adapter_mock, logger_mock):
    """Tests message sending with failure."""
    uc = SendContactUseCase(email_adapter_mock, logger_mock)
    email_adapter_mock.send_message.return_value = False

    success = await uc.execute(
        name="Maria",
        email="maria@example.com",
        subject="Test",
        message="Test message",
    )

    assert success is False
    email_adapter_mock.send_message.assert_called_once()
    logger_mock.error.assert_called()
