"""
Middleware de requisições HTTP com logging estruturado.

Adiciona:
- Request ID único para rastreamento
- Logging estruturado com structlog
- Medição de tempo de resposta
- Headers customizados de resposta
"""

import time
import uuid
import base64
import hmac
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

# Configurar structlog no módulo
from app.adaptadores.logger_adaptador import configurar_structlog
from app.configuracao import configuracoes
from app.core.limite import get_client_ip

configurar_structlog()
logger = structlog.get_logger(__name__)


def _mascarar_email(valor: str) -> str:
    if "@" not in valor:
        return "invalid-email"

    usuario, dominio = valor.split("@", 1)
    prefixo = usuario[:2] if len(usuario) >= 2 else usuario[:1]
    return f"{prefixo}***@{dominio.lower()}"


def _identidade_logavel(request: Request) -> str:
    identidade = getattr(request.state, "identidade", None)
    if not identidade:
        return "ip"

    if identidade.startswith("email:"):
        return f"email:{_mascarar_email(identidade.split(':', 1)[1])}"

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
        # Gerar ID único para rastreamento
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
            # Log de erro e re-raise para handlers tratarem
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
            # Enriquecer o log com o trace_id para correlacionar logs + traces
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
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
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
