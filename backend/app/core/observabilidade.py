"""
Módulo central de Observabilidade.

Configura três pilares de observabilidade:
  1. Sentry        — Error tracking e performance monitoring em produção
  2. Prometheus    — Métricas HTTP automáticas (via prometheus-fastapi-instrumentator)
  3. OpenTelemetry — Distributed tracing (spans end-to-end por requisição)

Deploy:
  - Koyeb (backend): expõe /metrics e envia traces via OTLP_ENDPOINT (opcional)
  - Vercel (frontend): não é afetado por este módulo
"""

from typing import Any

import structlog
from fastapi import FastAPI

logger = structlog.get_logger(__name__)


# ===========================================================================
# 1. SENTRY — Error Tracking
# ===========================================================================


def _configurar_sentry(dsn: str, ambiente: str, traces_sample_rate: float) -> None:
    """
    Inicializa o Sentry SDK.

    Só ativa se SENTRY_DSN estiver configurada — seguro em desenvolvimento
    e em ambientes de teste onde a variável não existe.

    Args:
        dsn: URL de conexão do projeto Sentry.
        ambiente: Nome do ambiente (local, staging, producao).
        traces_sample_rate: Percentual de transactions capturadas (0.0 a 1.0).
    """
    if not dsn:
        logger.info("sentry_desabilitado", motivo="SENTRY_DSN não configurada")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=ambiente,
            traces_sample_rate=traces_sample_rate,
            # Capture headers and request data to facilitate debug
            send_default_pii=False,  # False: não captura dados de usuário por padrão
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(transaction_style="endpoint"),
            ],
            # Ignora erros que são comportamento esperado (não bugs)
            ignore_errors=[
                KeyboardInterrupt,
            ],
        )
        logger.info(
            "sentry_configurado",
            ambiente=ambiente,
            traces_sample_rate=traces_sample_rate,
        )
    except ImportError:
        logger.warning("sentry_sdk_nao_instalado")


# ===========================================================================
# 2. PROMETHEUS — Métricas HTTP
# ===========================================================================


def _configurar_prometheus(app: FastAPI) -> None:
    """
    Instrumenta o FastAPI com métricas Prometheus automáticas.

    Expõe o endpoint GET /metrics com as seguintes métricas por rota:
      - http_requests_total          (counter)   — total de requests por status/método
      - http_request_size_bytes      (histogram) — tamanho dos requests
      - http_response_size_bytes     (histogram) — tamanho das respostas
      - http_request_duration_seconds (histogram) — latência (P50, P95, P99)

    O endpoint /metrics é compatível com scrape direto do Prometheus.
    No Koyeb, fica publicamente acessível em https://<app>.koyeb.app/metrics.
    """
    try:
        from prometheus_fastapi_instrumentator import Instrumentator

        Instrumentator(
            should_group_status_codes=True,  # agrupa 2xx, 4xx, 5xx
            should_ignore_untemplated=True,  # ignora rotas sem template (404s inválidos)
            should_respect_env_var=False,  # sempre ativo
            excluded_handlers=["/metrics"],  # não auto-instrumentar o próprio /metrics
        ).instrument(app).expose(
            app,
            endpoint="/metrics",
            include_in_schema=False,  # não exibir no /docs
            tags=["Observabilidade"],
        )

        logger.info("prometheus_configurado", endpoint="/metrics")
    except ImportError:
        logger.warning("prometheus_fastapi_instrumentator_nao_instalado")


# ===========================================================================
# 3. OPENTELEMETRY — Distributed Tracing
# ===========================================================================


def _configurar_opentelemetry(
    app: FastAPI,
    nome_servico: str,
    versao: str,
    ambiente: str,
    otlp_endpoint: str,
    sentry_dsn: str = "",
) -> None:
    """
    Configura o OpenTelemetry SDK para distributed tracing.

    Em desenvolvimento (sem OTLP_ENDPOINT): usa ConsoleSpanExporter para
    imprimir spans no stdout — útil para debug local.

    Em produção (com OTLP_ENDPOINT): exporta spans via OTLP/HTTP para
    qualquer backend compatível (Jaeger, Grafana Tempo, Honeycomb, etc).

    IMPORTANTE: Não usar o endpoint OTLP do Sentry aqui!
    O Sentry SDK (inicializado em _configurar_sentry) já captura tracing
    automaticamente via traces_sample_rate. Usar o OTLP_ENDPOINT do Sentry
    resulta em erros 401 pois requer autenticação especial não suportada
    pelo exportador OTLP padrão. Use apenas para backends standalone:
    Jaeger, Grafana Tempo, Honeycomb, etc.

    Args:
        nome_servico: Nome do serviço para identificação nos traces.
        versao: Versão da aplicação.
        ambiente: Ambiente de execução.
        otlp_endpoint: URL do coletor OTLP (ex: http://jaeger:4318).
                       Deixe vazio se usar Sentry — o SDK já faz o tracing.
    """
    try:
        from opentelemetry import trace
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.sdk.resources import SERVICE_NAME, SERVICE_VERSION, Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        # Recurso com metadados do serviço
        resource = Resource.create(
            {
                SERVICE_NAME: nome_servico,
                SERVICE_VERSION: versao,
                "deployment.environment": ambiente,
            }
        )

        provider = TracerProvider(resource=resource)

        # Exportador baseado no ambiente
        import io
        import os
        import sys

        if "pytest" in sys.modules or os.environ.get("PYTEST_CURRENT_TEST"):
            # During tests, we do not use BatchSpanProcessor to avoid
            # o erro "ValueError: I/O operation on closed file." ao final.
            from opentelemetry.sdk.trace.export import (
                ConsoleSpanExporter,
                SimpleSpanProcessor,
            )

            exporter: Any = ConsoleSpanExporter(out=io.StringIO())
            provider.add_span_processor(SimpleSpanProcessor(exporter))
            logger.info("otel_exporter_mock", motivo="Execução de testes detectada")
        elif otlp_endpoint:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
                OTLPSpanExporter,
            )

            otlp_endpoint = otlp_endpoint.strip().rstrip("/")

            if "sentry.io" in otlp_endpoint:
                logger.warning(
                    "otel_exporter_sentry_endpoint_ignorado",
                    motivo="O Sentry SDK já faz o tracing nativamente. "
                    "Use OTLP_ENDPOINT apenas para Jaeger/Grafana Tempo. ",
                    endpoint=otlp_endpoint,
                )
            else:
                final_endpoint = (
                    f"{otlp_endpoint}/v1/traces"
                    if not otlp_endpoint.endswith("/v1/traces")
                    else otlp_endpoint
                )

                exporter = OTLPSpanExporter(endpoint=final_endpoint)
                provider.add_span_processor(BatchSpanProcessor(exporter))
                logger.info("otel_exporter_otlp", endpoint=final_endpoint)

        else:
            if ambiente == "producao":
                logger.info(
                    "otel_exporter_console_skip",
                    motivo="OTLP_ENDPOINT vazio em producao; spans de tracing não serão exportados",
                )
                return

            from opentelemetry.sdk.trace.export import ConsoleSpanExporter

            exporter = ConsoleSpanExporter()
            provider.add_span_processor(BatchSpanProcessor(exporter))
            logger.info("otel_exporter_console", motivo="OTLP_ENDPOINT não configurado")

        # Register as global provider
        trace.set_tracer_provider(provider)

        # Auto-instrumentar FastAPI (captura spans por endpoint automaticamente)
        FastAPIInstrumentor().instrument_app(
            app,
            tracer_provider=provider,
            server_request_hook=_request_hook,
        )

        logger.info(
            "opentelemetry_configurado",
            servico=nome_servico,
            ambiente=ambiente,
        )
    except ImportError:
        logger.warning("opentelemetry_sdk_nao_instalado")


def _request_hook(span, scope: dict) -> None:
    """
    Hook executado ao iniciar cada span de request.

    Adiciona atributos extras ao span para facilitar filtros no backend
    de tracing (Jaeger, Grafana Tempo, etc).

    Args:
        span: Span OpenTelemetry atual.
        scope: Scope ASGI da requisição.
    """
    if span and span.is_recording():
        headers = dict(scope.get("headers", []))
        # X-Request-ID já gerado pelo nosso middleware
        request_id = headers.get(b"x-request-id", b"").decode("utf-8")
        if request_id:
            span.set_attribute("http.request_id", request_id)


# ===========================================================================
# ENTRY POINT — chamado no startup do principal.py
# ===========================================================================


def configurar_observabilidade(app: FastAPI, configuracoes) -> None:
    """
    Ponto de entrada único para configurar toda a stack de observabilidade.

    Ordem deliberada:
      1. Sentry primeiro — captura erros que possam ocorrer durante a inicialização
    """
    from app import __version__

    logger.info("observabilidade_inicializando", ambiente=configuracoes.ambiente)

    _configurar_sentry(
        dsn=configuracoes.sentry_dsn,
        ambiente=configuracoes.ambiente,
        traces_sample_rate=configuracoes.sentry_traces_sample_rate,
    )

    _configurar_prometheus(app)

    _configurar_opentelemetry(
        app=app,
        nome_servico=configuracoes.nome_app,
        versao=__version__,
        ambiente=configuracoes.ambiente,
        otlp_endpoint=configuracoes.otlp_endpoint,
        sentry_dsn=configuracoes.sentry_dsn,
    )

    logger.info("observabilidade_pronta")
