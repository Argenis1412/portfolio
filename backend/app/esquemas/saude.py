"""
Schemas Pydantic para endpoint de saúde.

Define contratos de entrada/saída para validação automática.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field


class RespostaSaude(BaseModel):
    """
    Schema de resposta do health check.

    Attributes:
        status: Status da API ("ok" ou "erro").
        mensagem: Descrição legível do status.
        versao_api: Versão da API.
        ambiente: Ambiente de execução.
        uptime_segundos: Tempo desde inicialização (opcional).
        detalhes: Detalhes opcionais sobre componentes.
    """

    status: str = Field(
        ...,
        examples=["ok"],
        description="Status da API",
    )
    mensagem: str = Field(
        ...,
        examples=["API funcionando normalmente"],
        description="Mensagem descritiva do status",
    )
    versao_api: str = Field(
        ...,
        examples=["1.0.0"],
        description="Versão da API",
    )
    ambiente: str = Field(
        ...,
        examples=["local", "staging", "production"],
        description="Ambiente de execução",
    )
    uptime_segundos: int | None = Field(
        default=None,
        examples=[3600],
        description="Tempo desde inicialização em segundos",
    )
    detalhes: Optional[dict[str, Any]] = Field(
        default=None,
        description="Detalhes sobre o status dos componentes",
    )


class ResumoMetricas(BaseModel):
    """
    Schema simplificado para dashboard de evidência no frontend.
    """

    p95_ms: int = Field(..., examples=[43], description="Latência P95 em ms")
    p95_status: str = Field(..., examples=["healthy"], description="Status da latência")
    requests_24h: int = Field(
        ..., examples=[987], description="Solicitações totais (24h)"
    )
    error_rate: float = Field(
        ..., examples=[0.0131], description="Taxa de erro decimal"
    )
    error_rate_pct: str = Field(
        ..., examples=["1.31%"], description="Taxa de erro formatada"
    )
    error_rate_status: str = Field(
        ..., examples=["stable"], description="Status da taxa de erro"
    )
    system_status: str = Field(
        ..., examples=["operational"], description="Estado geral do sistema"
    )
    uptime: str = Field(
        ..., examples=["2h 14m"], description="Tempo de atividade formatado"
    )
    window: str = Field(
        ..., examples=["last_24h"], description="Janela de tempo das métricas"
    )
    timestamp: str = Field(..., description="ISO 8601 timestamp da leitura")
