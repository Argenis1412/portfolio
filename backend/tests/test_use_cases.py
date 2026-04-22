"""
Testes dos casos de uso.

Testa lógica de negócio isoladamente, sem dependências de HTTP.
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
async def test_get_about_retorna_dados_correctos(repository_mock):
    """Testa que GetAboutUseCase retorna dados do repositório."""
    uc = GetAboutUseCase(repository_mock)

    resultado = await uc.execute()

    assert resultado["name"] == "Test Silva"
    assert resultado["email"] == "test@example.com"
    repository_mock.get_about.assert_called_once()


@pytest.mark.asyncio
async def test_get_projects_ordena_por_destaque(repository_mock):
    """Testa que projects destacados aparecem primeiro."""
    uc = GetProjectsUseCase(repository_mock)

    projects = await uc.execute()

    assert len(projects) == 2
    assert projects[0].highlighted is True  # Destacado primeiro
    assert projects[1].highlighted is False
    repository_mock.get_projects.assert_called_once()


@pytest.mark.asyncio
async def test_get_project_by_id_encontrado(repository_mock):
    """Testa busca de project existente por ID."""
    uc = GetProjectByIdUseCase(repository_mock)

    project = await uc.execute("project-1")

    assert project is not None
    assert project.id == "project-1"
    assert project.name == "Project A"


@pytest.mark.asyncio
async def test_get_project_by_id_nao_encontrado(repository_mock):
    """Testa busca de project inexistente retorna None."""
    uc = GetProjectByIdUseCase(repository_mock)

    project = await uc.execute("project-inexistente")

    assert project is None


@pytest.mark.asyncio
async def test_get_stack_agrupa_por_categoria(repository_mock):
    """Testa que stack é agrupado por categoria."""
    uc = GetStackUseCase(repository_mock)

    resultado = await uc.execute()

    assert "backend" in resultado
    assert "frontend" in resultado
    assert len(resultado["backend"]) == 1
    assert resultado["backend"][0]["name"] == "Python"
    repository_mock.get_stack.assert_called_once()


@pytest.mark.asyncio
async def test_get_experiences_ordena_cronologicamente(repository_mock):
    """Testa que experiências são ordenadas (atual primeiro)."""
    uc = GetExperiencesUseCase(repository_mock)

    experiences = await uc.execute()

    assert len(experiences) == 2
    assert experiences[0].current is True  # Atual primeiro
    assert experiences[1].current is False
    repository_mock.get_experiences.assert_called_once()


@pytest.mark.asyncio
async def test_get_formation_ordena_por_atual(repository_mock):
    """Testa que formações acadêmicas retornam ordenadas (em curso primeiro)."""
    uc = GetFormationUseCase(repository_mock)

    formations = await uc.execute()

    assert len(formations) == 1
    assert formations[0].current is True
    repository_mock.get_formation.assert_called_once()


@pytest.mark.asyncio
async def test_send_contact_sucesso(email_adapter_mock, logger_mock):
    """Testa envio de message com sucesso."""
    uc = SendContactUseCase(email_adapter_mock, logger_mock)
    email_adapter_mock.send_message.return_value = True

    sucesso = await uc.execute(
        name="Maria",
        email="maria@example.com",
        subject="Teste",
        message="Message de teste",
    )

    assert sucesso is True
    email_adapter_mock.send_message.assert_called_once()
    logger_mock.info.assert_called()


@pytest.mark.asyncio
async def test_send_contact_suspeito_recebe_marcacao_visivel(
    email_adapter_mock, logger_mock
):
    """Testa se emails suspeitos recebem aviso forte no assunto e corpo."""
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
    assert (
        "--- 🛡️ SECURITY WARNING (ANTI-SPAM FILTER) ---" in message_enviada.message
    )
    assert "Risk Level: 45/100" in message_enviada.message


@pytest.mark.asyncio
async def test_send_contact_falha(email_adapter_mock, logger_mock):
    """Testa envio de message com falha."""
    uc = SendContactUseCase(email_adapter_mock, logger_mock)
    email_adapter_mock.send_message.return_value = False

    sucesso = await uc.execute(
        name="Maria",
        email="maria@example.com",
        subject="Teste",
        message="Message de teste",
    )

    assert sucesso is False
    email_adapter_mock.send_message.assert_called_once()
    logger_mock.error.assert_called()
