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
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

# Configurar structlog no módulo
from app.adaptadores.logger_adaptador import configurar_structlog

configurar_structlog()
logger = structlog.get_logger(__name__)


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
        
        # Extrair identidade para rate limiting se for contato
        if request.method == "POST" and "/v1/contato" in request.url.path:
            try:
                # Tentar ler o corpo sem consumir o stream de forma destrutiva
                # Em Starlette, se lermos .json(), ele fica em cache no objeto request
                body = await request.json()
                email = body.get("email")
                if email:
                    request.state.identidade = f"email:{email.lower().strip()}"
            except:
                pass

        # Log da requisição recebida
        logger.info(
            "requisicao_recebida",
            query=str(request.url.query) if request.url.query else None,
            client_ip=request.client.host if request.client else None,
            identidade=getattr(request.state, "identidade", "ip"),
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
        
        # Log da resposta enviada
        logger.info(
            "resposta_enviada",
            status_code=response.status_code,
            duracao_ms=round(duracao_ms, 2),
        )
        
        # Limpar contexto
        structlog.contextvars.clear_contextvars()
        
        return response
