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