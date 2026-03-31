"""
Schemas para endpoint /api/v1/formacao.

Define contratos para listagem de formações acadêmicas.
"""

from pydantic import BaseModel, Field
from datetime import date

from app.esquemas.tipos_base import TextoLocalizado


class ItemFormacao(BaseModel):
    """
    Uma formação acadêmica.

    Attributes:
        id: Identificador único.
        curso: Nome do curso (internacionalizado).
        instituicao: Nome da instituição.
        localizacao: Localização da instituição.
        data_inicio: Data de início.
        data_fim: Data de término (None se em curso).
        descricao: Descrição da formação (internacionalizada).
        atual: Se é a formação atual.
    """

    id: str = Field(
        ...,
        examples=["edu-001"],
        description="Unique identifier",
    )
    curso: TextoLocalizado = Field(
        ...,
        description="Course name in PT, EN and ES",
    )
    instituicao: str = Field(
        ...,
        max_length=150,
        examples=["UFPR – Universidade Federal do Paraná"],
        description="Institution name",
    )
    localizacao: str = Field(
        ...,
        max_length=100,
        examples=["Curitiba, PR"],
        description="Institution location",
    )
    data_inicio: date = Field(
        ...,
        examples=["2026-02-01"],
        description="Start date (YYYY-MM-DD)",
    )
    data_fim: date | None = Field(
        default=None,
        examples=["2029-03-06"],
        description="End date (null if in progress)",
    )
    descricao: TextoLocalizado = Field(
        ...,
        description="Description in PT, EN and ES",
    )
    atual: bool = Field(
        default=False,
        description="Whether this is the current formation",
    )


class RespostaFormacao(BaseModel):
    """
    Resposta da listagem de formações acadêmicas.

    Attributes:
        formacoes: Lista de formações ordenadas por data.
        total: Quantidade total de formações.
    """

    formacoes: list[ItemFormacao] = Field(
        ...,
        description="List of academic formations",
    )
    total: int = Field(
        ...,
        ge=0,
        examples=[1],
        description="Total number of formations",
    )
