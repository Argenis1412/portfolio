"""
Módulo principal da aplicação FastAPI.

Este módulo configura a aplicação FastAPI com:
- CORS para desenvolvimento local (localhost:5173)
- Middleware de requisições (request_id, logging, tempo de resposta)
- Handlers globais de exceções
- Endpoint de health check (/saude)
- Rotas da API versionadas (/api/v1/*)
- Documentação automática (/docs)

Arquitetura: Clean Architecture simplificada
- Controllers (HTTP) → Use Cases (lógica) → Entities (domínio) → Adapters (externos)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.configuracao import configuracoes
from app.controladores import roteador_saude
from app.controladores.v1 import roteador_v1
from app.core.middleware import (
    MiddlewareRequisicao,
    ChaosMonkeyMiddleware,
    MetricsAccessMiddleware,
    SegurancaHeadersMiddleware,
)
from app.core.handlers import registrar_handlers_excecao
from app.core.observabilidade import configurar_observabilidade

from app.core.limite import limiter
from app import __version__


def criar_aplicacao() -> FastAPI:
    """
    Cria e configura a aplicação FastAPI.

    Returns:
        FastAPI: Instância configurada da aplicação.

    Configurações aplicadas:
        - Título e descrição para documentação OpenAPI
        - CORS para origens permitidas
        - Middleware de requisições
        - Handlers de exceções
        - Rotas versionadas
        - Logging estruturado
        - Rate limiting
    """
    # Configurar logging antes de criar app
    # Logging estruturado configurado automaticamente via middleware
    configuracoes.validar_producao()

    aplicacao = FastAPI(
        title=configuracoes.nome_app,
        description=_obter_descricao_api(),
        version=__version__,
        docs_url="/docs" if configuracoes.debug else None,
        redoc_url="/redoc" if configuracoes.debug else None,
        openapi_url="/openapi.json" if configuracoes.debug else None,
        openapi_tags=_obter_tags_openapi(),
        debug=configuracoes.debug,
    )

    # Observabilidade deve ser inicializada ANTES dos middlewares e rotas
    # para garantir que Sentry e Prometheus estejam ativos desde o início.
    configurar_observabilidade(aplicacao, configuracoes)

    _configurar_middleware(aplicacao)
    _configurar_cors(aplicacao)
    _registrar_handlers(aplicacao)
    _registrar_limiter(aplicacao)
    _registrar_rotas(aplicacao)

    return aplicacao


def _obter_descricao_api() -> str:
    """
    Retorna descrição markdown para documentação OpenAPI.

    Returns:
        str: Descrição formatada em markdown.
    """
    return """
    REST API for a backend developer portfolio.

    ## Architecture
    - **Clean Architecture**: Controllers → Use Cases → Entities → Adapters
    - **Validation**: Pydantic V2
    - **Tests**: pytest with coverage
    - **Logging**: Structured with request_id
    - **i18n**: Text fields available in PT, EN, and ES

    ## Versioning
    - **v1**: `/api/v1/*` (stable)

    ## Response Format
    - **Success**: Returns validated data directly
    - **Error**:
      ```json
      {
        \"erro\": {
          \"codigo\": \"ERROR_CODE\",
          \"mensagem\": \"Human-readable description\",
          \"detalhes\": {...}
        }
      }
      ```

    ## HTTP Status Codes
    - `200`: Success
    - `400`: Business rule error
    - `404`: Resource not found
    - `422`: Input validation failed
    - `429`: Too many requests (rate limited)
    - `500`: Internal server error

    ## Custom Headers
    - `X-Request-ID`: Unique ID for request tracing
    - `X-Response-Time`: Response time in ms
    """


def _obter_tags_openapi() -> list[dict]:
    """
    Define tags para agrupar endpoints na documentação.

    Returns:
        list[dict]: Lista de tags com descrições.
    """
    return [
        {
            "name": "Health",
            "description": "Health check and application status",
        },
        {
            "name": "API v1",
            "description": "API version 1 (recommended)",
        },
        {
            "name": "Portfolio",
            "description": "Portfolio data (about, projects, stack, experiences)",
        },
        {
            "name": "Contact",
            "description": "Contact form message submission",
        },
    ]


def _configurar_cors(aplicacao: FastAPI) -> None:
    """
    Configura CORS (Cross-Origin Resource Sharing).

    Args:
        aplicacao: Instância FastAPI para configurar.

    Permite requisições do frontend em localhost:5173 (Vite dev server).
    """
    aplicacao.add_middleware(
        CORSMiddleware,
        allow_origins=configuracoes.lista_origens_permitidas(),
        allow_origin_regex=configuracoes.regex_origens_permitidas,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )


def _configurar_middleware(aplicacao: FastAPI) -> None:
    """
    Configura middleware da aplicação.

    Args:
        aplicacao: Instância FastAPI.

    Middleware applied:
        - MiddlewareRequisicao: request_id, logging, response time
    """
    # 1. Request ID injection and structured logging
    aplicacao.add_middleware(MiddlewareRequisicao)

    # 1.5. Protect the /metrics endpoint in production
    aplicacao.add_middleware(ChaosMonkeyMiddleware)
    aplicacao.add_middleware(MetricsAccessMiddleware)

    # 2. GZip compression (saves bandwidth, only for responses > 1KB)
    aplicacao.add_middleware(GZipMiddleware, minimum_size=1000)

    # 3. Security headers (Clickjacking protection, etc.)
    aplicacao.add_middleware(SegurancaHeadersMiddleware)


def _registrar_handlers(aplicacao: FastAPI) -> None:
    """
    Registra handlers globais de exceções.

    Args:
        aplicacao: Instância FastAPI.
    """
    registrar_handlers_excecao(aplicacao)


def _registrar_limiter(aplicacao: FastAPI) -> None:
    """
    Configura o rate limiter na aplicação.

    Args:
        aplicacao: Instância FastAPI.
    """
    aplicacao.state.limiter = limiter


def _registrar_rotas(aplicacao: FastAPI) -> None:
    """
    Registra todos os roteadores na aplicação.

    Args:
        aplicacao: Instância FastAPI para registrar rotas.

    Rotas registradas:
        - /saude: Health check (sem prefixo)
        - /api/v1/*: API versionada
    """
    # Health check (sem prefixo, usado por probes)
    aplicacao.include_router(roteador_saude)

    # Rota raiz para evitar 404 (Koyeb/Público)
    @aplicacao.get("/", tags=["Health"])
    async def root():
        return {
            "status": "ok",
            "servico": configuracoes.nome_app,
            "versao": __version__,
            "docs": "/docs",
        }

    # API v1 (recomendado)
    aplicacao.include_router(roteador_v1, prefix="/api")


# Instância global da aplicação (usada pelo uvicorn)
app = criar_aplicacao()
