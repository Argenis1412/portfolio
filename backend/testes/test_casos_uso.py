"""
Testes dos casos de uso.

Testa lógica de negócio isoladamente, sem dependências de HTTP.
"""

import pytest

from app.casos_uso import (
    EnviarContatoUseCase,
    ObterExperienciasUseCase,
    ObterFormacaoUseCase,
    ObterProjetoPorIdUseCase,
    ObterProjetosUseCase,
    ObterSobreUseCase,
    ObterStackUseCase,
)


@pytest.mark.asyncio
async def test_obter_sobre_retorna_dados_corretos(repositorio_mock):
    """Testa que ObterSobreUseCase retorna dados do repositório."""
    uc = ObterSobreUseCase(repositorio_mock)

    resultado = await uc.executar()

    assert resultado["nome"] == "Teste Silva"
    assert resultado["email"] == "teste@example.com"
    repositorio_mock.obter_sobre.assert_called_once()


@pytest.mark.asyncio
async def test_obter_projetos_ordena_por_destaque(repositorio_mock):
    """Testa que projetos destacados aparecem primeiro."""
    uc = ObterProjetosUseCase(repositorio_mock)

    projetos = await uc.executar()

    assert len(projetos) == 2
    assert projetos[0].destaque is True  # Destacado primeiro
    assert projetos[1].destaque is False
    repositorio_mock.obter_projetos.assert_called_once()


@pytest.mark.asyncio
async def test_obter_projeto_por_id_encontrado(repositorio_mock):
    """Testa busca de projeto existente por ID."""
    uc = ObterProjetoPorIdUseCase(repositorio_mock)

    projeto = await uc.executar("projeto-1")

    assert projeto is not None
    assert projeto.id == "projeto-1"
    assert projeto.nome == "Projeto A"


@pytest.mark.asyncio
async def test_obter_projeto_por_id_nao_encontrado(repositorio_mock):
    """Testa busca de projeto inexistente retorna None."""
    uc = ObterProjetoPorIdUseCase(repositorio_mock)

    projeto = await uc.executar("projeto-inexistente")

    assert projeto is None


@pytest.mark.asyncio
async def test_obter_stack_agrupa_por_categoria(repositorio_mock):
    """Testa que stack é agrupado por categoria."""
    uc = ObterStackUseCase(repositorio_mock)

    resultado = await uc.executar()

    assert "backend" in resultado
    assert "frontend" in resultado
    assert len(resultado["backend"]) == 1
    assert resultado["backend"][0]["nome"] == "Python"
    repositorio_mock.obter_stack.assert_called_once()


@pytest.mark.asyncio
async def test_obter_experiencias_ordena_cronologicamente(repositorio_mock):
    """Testa que experiências são ordenadas (atual primeiro)."""
    uc = ObterExperienciasUseCase(repositorio_mock)

    experiencias = await uc.executar()

    assert len(experiencias) == 2
    assert experiencias[0].atual is True  # Atual primeiro
    assert experiencias[1].atual is False
    repositorio_mock.obter_experiencias.assert_called_once()


@pytest.mark.asyncio
async def test_obter_formacao_ordena_por_atual(repositorio_mock):
    """Testa que formações acadêmicas retornam ordenadas (em curso primeiro)."""
    uc = ObterFormacaoUseCase(repositorio_mock)

    formacoes = await uc.executar()

    assert len(formacoes) == 1
    assert formacoes[0].atual is True
    repositorio_mock.obter_formacao.assert_called_once()


@pytest.mark.asyncio
async def test_enviar_contato_sucesso(email_adaptador_mock, logger_mock):
    """Testa envio de mensagem com sucesso."""
    uc = EnviarContatoUseCase(email_adaptador_mock, logger_mock)
    email_adaptador_mock.enviar_mensagem.return_value = True

    sucesso = await uc.executar(
        nome="Maria",
        email="maria@example.com",
        assunto="Teste",
        mensagem="Mensagem de teste",
    )

    assert sucesso is True
    email_adaptador_mock.enviar_mensagem.assert_called_once()
    logger_mock.info.assert_called()


@pytest.mark.asyncio
async def test_enviar_contato_suspeito_recebe_marcacao_visivel(
    email_adaptador_mock, logger_mock
):
    """Testa se emails suspeitos recebem aviso forte no assunto e corpo."""
    uc = EnviarContatoUseCase(email_adaptador_mock, logger_mock)
    email_adaptador_mock.enviar_mensagem.return_value = True

    await uc.executar(
        nome="Maria",
        email="maria@example.com",
        assunto="Security review",
        mensagem="Please click this urgent link.",
        is_suspicious=True,
        spam_score=45,
    )

    mensagem_enviada = email_adaptador_mock.enviar_mensagem.call_args.args[0]
    assert mensagem_enviada.assunto.startswith("[⚠ POSSÍVEL SPAM]")
    assert (
        "--- 🛡️ AVISO DE SEGURANÇA (FILTRO ANTI-SPAM) ---" in mensagem_enviada.mensagem
    )
    assert "Nível de Risco: 45/100" in mensagem_enviada.mensagem


@pytest.mark.asyncio
async def test_enviar_contato_falha(email_adaptador_mock, logger_mock):
    """Testa envio de mensagem com falha."""
    uc = EnviarContatoUseCase(email_adaptador_mock, logger_mock)
    email_adaptador_mock.enviar_mensagem.return_value = False

    sucesso = await uc.executar(
        nome="Maria",
        email="maria@example.com",
        assunto="Teste",
        mensagem="Mensagem de teste",
    )

    assert sucesso is False
    email_adaptador_mock.enviar_mensagem.assert_called_once()
    logger_mock.erro.assert_called()
