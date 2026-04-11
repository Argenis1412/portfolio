"""
Handlers globais de exceções.

Converte exceções customizadas em respostas HTTP padronizadas.
Registrado automaticamente no startup da aplicação.
"""

import structlog
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.excecoes import (
    ErroDominio,
    ErroValidacao,
    ErroInfraestrutura,
    ErroRecursoNaoEncontrado,
)
from app.core.idempotencia import IdempotencyException
from slowapi.errors import RateLimitExceeded

logger = structlog.get_logger(__name__)


def criar_resposta_erro(
    codigo: str,
    mensagem: str,
    status_code: int,
    detalhes: Any = None,
    trace_id: str | None = None,
) -> JSONResponse:
    """
    Cria resposta JSON padronizada para erros.

    Args:
        codigo: Código interno do erro.
        mensagem: Mensagem descritiva.
        status_code: Código HTTP.
        detalhes: Informações adicionais (opcional).

    Returns:
        JSONResponse: Resposta formatada.
    """
    conteudo = {
        "erro": {
            "codigo": codigo,
            "mensagem": mensagem,
        }
    }

    if detalhes:
        conteudo["erro"]["detalhes"] = detalhes

    if trace_id:
        conteudo["erro"]["trace_id"] = trace_id

    return JSONResponse(
        status_code=status_code,
        content=conteudo,
    )


async def handler_erro_dominio(
    request: Request,
    exc: ErroDominio,
) -> JSONResponse:
    """
    Trata erros de domínio/negócio.

    Args:
        request: Requisição HTTP.
        exc: Exceção de domínio.

    Returns:
        JSONResponse: HTTP 400 com detalhes do erro.
    """
    logger.warning(
        "erro_dominio",
        mensagem=exc.mensagem,
        codigo=exc.codigo,
        path=request.url.path,
    )

    return criar_resposta_erro(
        codigo=exc.codigo,
        mensagem=exc.mensagem,
        status_code=status.HTTP_400_BAD_REQUEST,
        trace_id=getattr(request.state, "request_id", None),
    )


async def handler_erro_validacao(
    request: Request,
    exc: ErroValidacao,
) -> JSONResponse:
    """
    Trata erros de validação de negócio.

    Args:
        request: Requisição HTTP.
        exc: Exceção de validação.

    Returns:
        JSONResponse: HTTP 422 com detalhes do erro.
    """
    logger.warning(
        "erro_validacao_negocio",
        mensagem=exc.mensagem,
        codigo=exc.codigo,
        path=request.url.path,
    )

    return criar_resposta_erro(
        codigo=exc.codigo,
        mensagem=exc.mensagem,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        trace_id=getattr(request.state, "request_id", None),
    )


async def handler_erro_infraestrutura(
    request: Request,
    exc: ErroInfraestrutura,
) -> JSONResponse:
    """
    Trata erros de infraestrutura externa.

    Args:
        request: Requisição HTTP.
        exc: Exceção de infraestrutura.

    Returns:
        JSONResponse: HTTP 500 com mensagem genérica.
    """
    logger.error(
        "erro_infraestrutura",
        mensagem=exc.mensagem,
        codigo=exc.codigo,
        origem=exc.origem,
        path=request.url.path,
        exc_info=True,
    )

    # Não expor detalhes internos em produção
    return criar_resposta_erro(
        codigo="ERRO_INTERNO",
        mensagem="Erro interno do servidor. Tente novamente mais tarde.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        trace_id=getattr(request.state, "request_id", None),
    )


async def handler_recurso_nao_encontrado(
    request: Request,
    exc: ErroRecursoNaoEncontrado,
) -> JSONResponse:
    """
    Trata erros de recurso não encontrado.

    Args:
        request: Requisição HTTP.
        exc: Exceção de recurso não encontrado.

    Returns:
        JSONResponse: HTTP 404 com mensagem.
    """
    logger.info(
        "recurso_nao_encontrado",
        mensagem=exc.mensagem,
        codigo=exc.codigo,
        path=request.url.path,
    )

    return criar_resposta_erro(
        codigo=exc.codigo,
        mensagem=exc.mensagem,
        status_code=status.HTTP_404_NOT_FOUND,
        trace_id=getattr(request.state, "request_id", None),
    )


async def handler_validacao_pydantic(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """
    Trata erros de validação do Pydantic.

    Args:
        request: Requisição HTTP.
        exc: Erro de validação do FastAPI/Pydantic.

    Returns:
        JSONResponse: HTTP 422 com detalhes dos campos inválidos.
    """
    erros_formatados = []

    for erro in exc.errors():
        campo = ".".join(str(loc) for loc in erro["loc"])
        erros_formatados.append(
            {
                "campo": campo,
                "mensagem": erro["msg"],
                "tipo": erro["type"],
            }
        )

    logger.warning(
        "erro_validacao_pydantic",
        total_campos_invalidos=len(erros_formatados),
        path=request.url.path,
        erros=erros_formatados,
    )

    return criar_resposta_erro(
        codigo="ERRO_VALIDACAO_ENTRADA",
        mensagem="Dados de entrada inválidos",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detalhes=erros_formatados,
        trace_id=getattr(request.state, "request_id", None),
    )


async def handler_generico(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """
    Fallback para exceções não tratadas.

    Args:
        request: Requisição HTTP.
        exc: Exceção não capturada.

    Returns:
        JSONResponse: HTTP 500 genérico.
    """
    logger.error(
        "excecao_nao_tratada",
        tipo_erro=type(exc).__name__,
        erro=str(exc),
        path=request.url.path,
        exc_info=True,
    )

    return criar_resposta_erro(
        codigo="ERRO_INESPERADO",
        mensagem="Erro inesperado. A equipe foi notificada.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        trace_id=getattr(request.state, "request_id", None),
    )


async def handler_rate_limit(
    request: Request,
    exc: RateLimitExceeded,
) -> JSONResponse:
    """
    Trata erros de rate limit excedido.
    """
    logger.warning(
        "rate_limit_excedido",
        path=request.url.path,
        detalhes=str(exc),
    )

    return criar_resposta_erro(
        codigo="RATE_LIMIT_EXCEEDED",
        mensagem=f"Rate limit exceeded. {str(exc)}",
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        trace_id=getattr(request.state, "request_id", None),
    )


async def handler_idempotencia(
    request: Request,
    exc: IdempotencyException,
) -> JSONResponse:
    """
    Trata exceção de idempotência retornando a resposta cacheada.
    """
    logger.info(
        "idempotencia_cache_hit",
        path=request.url.path,
        status_code=exc.record.status_code,
    )

    return JSONResponse(
        status_code=exc.record.status_code,
        content=exc.record.content,
        headers={"X-Cache-Idempotency": "HIT"},
    )


async def handler_http_starlette(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    """
    Trata exceções HTTP do Starlette (ex: 404 rota não encontrada).
    """
    return criar_resposta_erro(
        codigo="ERRO_HTTP",
        mensagem=str(exc.detail),
        status_code=exc.status_code,
        trace_id=getattr(request.state, "request_id", None),
    )


def registrar_handlers_excecao(app: FastAPI) -> None:
    """
    Registra todos os handlers de exceção na aplicação.

    Args:
        app: Instância FastAPI.

    Handlers registrados:
        - ErroDominio → 400
        - ErroValidacao → 422
        - ErroInfraestrutura → 500
        - ErroRecursoNaoEncontrado → 404
        - RequestValidationError → 422
        - Exception (fallback) → 500
    """
    app.add_exception_handler(ErroDominio, handler_erro_dominio)  # type: ignore
    app.add_exception_handler(ErroValidacao, handler_erro_validacao)  # type: ignore
    app.add_exception_handler(ErroInfraestrutura, handler_erro_infraestrutura)  # type: ignore
    app.add_exception_handler(ErroRecursoNaoEncontrado, handler_recurso_nao_encontrado)  # type: ignore
    app.add_exception_handler(RequestValidationError, handler_validacao_pydantic)  # type: ignore
    app.add_exception_handler(IdempotencyException, handler_idempotencia)  # type: ignore
    app.add_exception_handler(RateLimitExceeded, handler_rate_limit)  # type: ignore
    app.add_exception_handler(StarletteHTTPException, handler_http_starlette)  # type: ignore
    app.add_exception_handler(Exception, handler_generico)  # type: ignore

    logger.info("Handlers de exceção registrados com sucesso")
