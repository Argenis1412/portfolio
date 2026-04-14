"""
Provedores de dependencias para os controladores HTTP.

Centraliza a composicao de adaptadores e casos de uso para usar com FastAPI Depends.
"""

from functools import lru_cache

from app.adaptadores import (
    EmailAdaptador,
    FormspreeEmailAdaptador,
    LoggerEstruturado,
    RepositorioJSON,
    RepositorioSQL,
)
from app.adaptadores.repositorio import RepositorioPortfolio
from app.casos_uso import (
    EnviarContatoUseCase,
    ObterExperienciasUseCase,
    ObterFormacaoUseCase,
    ObterProjetoPorIdUseCase,
    ObterProjetosUseCase,
    ObterSobreUseCase,
    ObterStackUseCase,
)
from app.configuracao import configuracoes


@lru_cache
def obter_repositorio_estatico() -> RepositorioPortfolio:
    """Retorna repositorio de dados compartilhado para leitura estática JSON."""
    return RepositorioJSON()


@lru_cache
def obter_repositorio() -> RepositorioPortfolio:
    """Retorna repositorio transacional (SQL) para form e rate limit."""
    return RepositorioSQL()


@lru_cache
def dep_sobre() -> ObterSobreUseCase:
    """Retorna caso de uso para secao sobre."""
    return ObterSobreUseCase(obter_repositorio_estatico())


@lru_cache
def dep_projetos() -> ObterProjetosUseCase:
    """Retorna caso de uso para listagem de projetos."""
    return ObterProjetosUseCase(obter_repositorio_estatico())


@lru_cache
def dep_projeto_por_id() -> ObterProjetoPorIdUseCase:
    """Retorna caso de uso para detalhes de projeto."""
    return ObterProjetoPorIdUseCase(obter_repositorio_estatico())


@lru_cache
def dep_stack() -> ObterStackUseCase:
    """Retorna caso de uso para stack tecnico."""
    return ObterStackUseCase(obter_repositorio_estatico())


@lru_cache
def dep_experiencias() -> ObterExperienciasUseCase:
    """Retorna caso de uso para experiencias profissionais."""
    return ObterExperienciasUseCase(obter_repositorio_estatico())


@lru_cache
def dep_formacao() -> ObterFormacaoUseCase:
    """Retorna caso de uso para formações acadêmicas."""
    return ObterFormacaoUseCase(obter_repositorio_estatico())


@lru_cache
def obter_enviar_contato_use_case() -> EnviarContatoUseCase:
    """Retorna caso de uso para envio de contato."""
    email_adaptador: EmailAdaptador
    
    # Prioridade 1: Resend (Produção e profissional)
    if configuracoes.resend_api_key.strip():
        from app.adaptadores.email_adaptador import ResendEmailAdaptador
        email_adaptador = ResendEmailAdaptador(
            configuracoes.resend_api_key,
            configuracoes.resend_from_email,
            configuracoes.resend_to_email,
        )
    # Prioridade 2: Console (Desenvolvimento local)
    elif configuracoes.ambiente == "local" and not configuracoes.formspree_form_id.strip():
        from app.adaptadores.email_adaptador import ConsoleEmailAdaptador
        email_adaptador = ConsoleEmailAdaptador()
    # Prioridade 3: Formspree (Legado/Fallback)
    else:
        email_adaptador = FormspreeEmailAdaptador(
            configuracoes.formspree_url,
            configuracoes.formspree_form_id,
        )

    logger = LoggerEstruturado()
    return EnviarContatoUseCase(email_adaptador, logger)
