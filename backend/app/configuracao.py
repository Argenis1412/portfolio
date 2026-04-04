"""
Configurações da aplicação via variáveis de ambiente.

Usa pydantic-settings para validação automática e valores padrão.
Todas as configurações podem ser sobrescritas via .env ou variáveis de ambiente.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Configuracoes(BaseSettings):
    """
    Configurações centralizadas da aplicação.

    Attributes:
        nome_app: Nome exibido na documentação OpenAPI.
        ambiente: Ambiente de execução (local, staging, production).
        origens_permitidas: Lista de origens CORS separadas por vírgula.
        formspree_url: URL do endpoint Formspree para envio de emails.
        formspree_form_id: ID do formulário Formspree.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    nome_app: str = Field(
        default="Portfólio Backend API",
        alias="NOME_APP",
    )
    ambiente: str = Field(
        default="local",
        alias="AMBIENTE",
    )
    origens_permitidas: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:4173,http://127.0.0.1:4173",
        alias="ORIGENS_PERMITIDAS",
    )
    regex_origens_permitidas: str | None = Field(
        default=r"^(https://portfolio(?:-[a-zA-Z0-9\-]+)?-argenis1412s-projects\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+)$",
        alias="REGEX_ORIGENS_PERMITIDAS",
    )
    formspree_url: str = Field(
        default="https://formspree.io/f",
        alias="FORMSPREE_URL",
    )
    formspree_form_id: str = Field(
        default="",
        alias="FORMSPREE_FORM_ID",
    )
    database_url: str = Field(
        default="sqlite+aiosqlite:///./portfolio.db",
        alias="DATABASE_URL",
    )
    redis_url: str | None = Field(
        default=None,
        alias="REDIS_URL",
        description="URL do Redis para cache e rate limiting (ex: redis://localhost:6379/0).",
    )

    # --- Observabilidade ---
    sentry_dsn: str = Field(
        default="",
        alias="SENTRY_DSN",
        description="DSN do Sentry. Deixe vazio para desabilitar (desenvolvimento/testes).",
    )
    sentry_traces_sample_rate: float = Field(
        default=0.2,
        alias="SENTRY_TRACES_SAMPLE_RATE",
        description="Percentual de transactions enviadas ao Sentry (0.0 a 1.0). 0.2 = 20%.",
    )
    otlp_endpoint: str = Field(
        default="",
        alias="OTLP_ENDPOINT",
        description="Endpoint OTLP para exportar traces (ex: http://jaeger:4318). Vazio = ConsoleExporter.",
    )

    def lista_origens_permitidas(self) -> list[str]:
        """
        Converte string de origens em lista.

        Returns:
            Lista de URLs permitidas para CORS.

        Example:
            "http://localhost:5173,http://127.0.0.1:5173"
            → ["http://localhost:5173", "http://127.0.0.1:5173"]
        """
        return [
            origem.strip()
            for origem in self.origens_permitidas.split(",")
            if origem.strip()
        ]

    @property
    def debug(self) -> bool:
        """
        Retorna True se o ambiente for de desenvolvimento ou local.
        Isto evita vazar stack traces em produção.
        """
        return self.ambiente in ("desenvolvimento", "local")


# Instância global de configurações
configuracoes = Configuracoes()