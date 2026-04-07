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
    formspree_timeout_seconds: float = Field(
        default=10.0,
        alias="FORMSPREE_TIMEOUT_SECONDS",
    )
    redis_socket_timeout_seconds: float = Field(
        default=5.0,
        alias="REDIS_SOCKET_TIMEOUT_SECONDS",
    )
    redis_connect_timeout_seconds: float = Field(
        default=5.0,
        alias="REDIS_CONNECT_TIMEOUT_SECONDS",
    )
    db_connect_timeout_seconds: float = Field(
        default=5.0,
        alias="DB_CONNECT_TIMEOUT_SECONDS",
    )
    db_command_timeout_seconds: float = Field(
        default=10.0,
        alias="DB_COMMAND_TIMEOUT_SECONDS",
    )
    db_pool_size: int = Field(
        default=2,
        alias="DB_POOL_SIZE",
        description="SQLAlchemy pool size (default 2 for serverless/small instances).",
    )
    db_max_overflow: int = Field(
        default=5,
        alias="DB_MAX_OVERFLOW",
        description="SQLAlchemy max overflow connections.",
    )
    db_pool_recycle_seconds: int = Field(
        default=300,
        alias="DB_POOL_RECYCLE_SECONDS",
    )
    db_pool_timeout_seconds: float = Field(
        default=30.0,
        alias="DB_POOL_TIMEOUT_SECONDS",
    )
    db_pool_use_lifo: bool = Field(
        default=True,
        alias="DB_POOL_USE_LIFO",
        description="Use LIFO for pool connections (better for serverless).",
    )
    metrics_basic_auth_username: str = Field(
        default="",
        alias="METRICS_BASIC_AUTH_USERNAME",
    )
    metrics_basic_auth_password: str = Field(
        default="",
        alias="METRICS_BASIC_AUTH_PASSWORD",
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

    @property
    def is_production(self) -> bool:
        return self.ambiente == "producao"

    @property
    def metrics_basic_auth_enabled(self) -> bool:
        return bool(
            self.metrics_basic_auth_username.strip()
            and self.metrics_basic_auth_password.strip()
        )

    def validar_producao(self) -> None:
        """Garante requisitos mínimos de segurança e infraestrutura em produção."""
        if not self.is_production:
            return

        erros: list[str] = []

        if self.database_url.startswith("sqlite"):
            erros.append("SQLite is not allowed in production")

        if not self.database_url.startswith("postgresql+asyncpg://"):
            erros.append("DATABASE_URL must use postgresql+asyncpg in production")

        if not self.redis_url:
            erros.append("REDIS_URL is required in production")

        if not self.metrics_basic_auth_enabled:
            erros.append(
                "METRICS_BASIC_AUTH_USERNAME and METRICS_BASIC_AUTH_PASSWORD are required in production"
            )

        if "*" in self.origens_permitidas:
            erros.append("ORIGENS_PERMITIDAS cannot contain wildcard '*' in production")

        if self.regex_origens_permitidas and self.regex_origens_permitidas.strip() in {".*", "^.*$"}:
            erros.append("REGEX_ORIGENS_PERMITIDAS is too permissive for production")

        if erros:
            raise RuntimeError("Invalid production configuration: " + "; ".join(erros))


# Instância global de configurações
configuracoes = Configuracoes()
