"""
Middleware de requisições HTTP com logging estruturado.

Adiciona:
- Request ID único para rastreamento
- Logging estruturado com structlog
- Medição de tempo de resposta
- Headers customizados de resposta
"""

import json
import uuid
import hmac
import base64
import time
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.adaptadores.logger_adaptador import configurar_structlog
from app.configuracao import configuracoes
from app.core.limite import get_client_ip
from app.utils.email import mascarar_email


# Configurar structlog no módulo
configurar_structlog()
logger = structlog.get_logger(__name__)


def _identidade_logavel(request: Request) -> str:
    identidade = getattr(request.state, "identidade", None)
    if not identidade:
        return "ip"

    if identidade.startswith("email:"):
        return f"email:{mascarar_email(identidade.split(':', 1)[1])}"

    return identidade


def _credenciais_metrics_validas(authorization_header: str | None) -> bool:
    if not authorization_header or not authorization_header.startswith("Basic "):
        return False

    try:
        encoded_credentials = authorization_header.split(" ", 1)[1]
        decoded = base64.b64decode(encoded_credentials).decode("utf-8")
        username, password = decoded.split(":", 1)
    except Exception:
        return False

    return hmac.compare_digest(
        username, configuracoes.metrics_basic_auth_username
    ) and hmac.compare_digest(
        password,
        configuracoes.metrics_basic_auth_password,
    )


def _obter_trace_id() -> str:
    """
    Extrai o trace_id do span ativo no OpenTelemetry.

    Retorna string vazia se OTel não estiver configurado ou se não
    houver span ativo (ex: durante testes unitários).
    """
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        ctx = span.get_span_context()
        if ctx and ctx.is_valid:
            return format(ctx.trace_id, "032x")
    except Exception:
        pass
    return ""


class MiddlewareRequisicao(BaseHTTPMiddleware):
    """
    Middleware para processar todas as requisições HTTP.

    Funcionalidades:
        - Gera request_id único (UUID4)
        - Adiciona request_id no contexto do structlog
        - Mede tempo de resposta
        - Loga método, path, status e duração
        - Adiciona headers: X-Request-ID, X-Response-Time
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        """
        Processa requisição e adiciona metadados.

        Args:
            request: Requisição HTTP recebida.
            call_next: Próximo handler na cadeia.

        Returns:
            Response: Resposta com headers adicionais.
        """
        # Generate unique ID for tracking
        request_id = str(uuid.uuid4())

        # Adicionar request_id no state do request
        request.state.request_id = request_id

        # Adicionar request_id ao contexto do structlog
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            metodo=request.method,
            path=request.url.path,
        )

        # Timestamp de início
        inicio = time.time()

        # Log da requisição recebida
        logger.info(
            "requisicao_recebida",
            query=str(request.url.query) if request.url.query else None,
            client_ip=get_client_ip(request),
            identidade=_identidade_logavel(request),
        )

        # Processar requisição
        try:
            response = await call_next(request)
        except Exception as exc:
            # Log error and re-raise for handlers to catch
            logger.error(
                "erro_processamento_requisicao",
                erro=str(exc),
                tipo_erro=type(exc).__name__,
                exc_info=True,
            )
            raise

        # Calcular tempo de resposta
        duracao_ms = (time.time() - inicio) * 1000

        # Adicionar headers customizados
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duracao_ms:.2f}ms"

        # Propagar trace_id do OpenTelemetry (link com Jaeger/Grafana Tempo)
        trace_id = _obter_trace_id()
        if trace_id:
            response.headers["X-Trace-ID"] = trace_id
            # Enrich log with trace_id to correlate logs + traces
            structlog.contextvars.bind_contextvars(trace_id=trace_id)

        # Log da resposta enviada
        logger.info(
            "resposta_enviada",
            status_code=response.status_code,
            duracao_ms=round(duracao_ms, 2),
        )

        # Limpar contexto
        structlog.contextvars.clear_contextvars()

        return response


class SegurancaHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware para adicionar headers de segurança em todas as respostas.
    Reflete as proteções configuradas no vercel.json para o backend.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )

        if not (
            request.url.path.startswith("/docs")
            or request.url.path.startswith("/redoc")
        ):
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
            )

        return response


class MetricsAccessMiddleware(BaseHTTPMiddleware):
    """Restricts /metrics in production using basic auth."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path != "/metrics" or not configuracoes.is_production:
            return await call_next(request)

        if _credenciais_metrics_validas(request.headers.get("authorization")):
            return await call_next(request)

        logger.warning(
            "metrics_access_denied",
            client_ip=get_client_ip(request),
        )
        return Response(
            status_code=401,
            headers={"WWW-Authenticate": 'Basic realm="metrics"'},
        )


class ChaosMonkeyMiddleware(BaseHTTPMiddleware):
    """
    Middleware para simular cenários de erro e resiliência.
    Ativado via header 'X-Debug-Mode'.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Simular Rate Limit (429)
        if request.headers.get("X-Debug-Mode") == "simulate-429":
            logger.warning(
                "chaos_monkey_triggered",
                simulation="rate_limit_429",
                path=request.url.path,
            )
            return Response(
                status_code=429,
                content=json.dumps(
                    {
                        "erro": {
                            "codigo": "RATE_LIMIT_EXCEEDED",
                            "mensagem": "Chaos Monkey: Simulated rate limit exceeded",
                            "detalhes": {"retry_after": 30},
                        }
                    }
                ),
                media_type="application/json",
                headers={"Retry-After": "30"},
            )

        # Simular Erro Interno (500)
        if request.headers.get("X-Debug-Mode") == "simulate-500":
            logger.error(
                "chaos_monkey_triggered",
                simulation="internal_error_500",
                path=request.url.path,
            )
            return Response(
                status_code=500,
                content=json.dumps(
                    {
                        "erro": {
                            "codigo": "ERRO_INESPERADO",
                            "mensagem": "Chaos Monkey: Simulated internal server error",
                        }
                    }
                ),
                media_type="application/json",
            )

        return await call_next(request)
