"""
Schemas para endpoint /api/experiencias.

Define contratos para listagem de experiências profissionais.
"""

from pydantic import BaseModel, Field
from datetime import date

from app.esquemas.tipos_base import TextoLocalizado


class Experiencia(BaseModel):
    """
    Uma experiência profissional.

    Attributes:
        id: Identificador único.
        cargo: Título do cargo.
        empresa: Nome da empresa.
        localizacao: Localização do trabalho.
        data_inicio: Data de início.
        data_fim: Data de término (None se atual).
        descricao: Descrição das atividades (internacionalizada).
        tecnologias: Tecnologias utilizadas.
        atual: Se é o emprego atual.
    """

    id: str = Field(
        ...,
        examples=["exp-001"],
        description="Unique identifier",
    )
    cargo: TextoLocalizado = Field(
        ...,
        description="Job title in PT, EN and ES",
    )
    empresa: str = Field(
        ...,
        max_length=100,
        examples=["Tech Company"],
        description="Company name",
    )
    localizacao: str = Field(
        ...,
        max_length=100,
        examples=["Remote"],
        description="Work location",
    )
    data_inicio: date = Field(
        ...,
        examples=["2023-01-01"],
        description="Start date (YYYY-MM-DD)",
    )
    data_fim: date | None = Field(
        default=None,
        examples=["2024-06-01"],
        description="End date (null if current position)",
    )
    descricao: TextoLocalizado = Field(
        ...,
        description="Activity description in PT, EN and ES",
    )
    tecnologias: list[str] = Field(
        ...,
        examples=[["Python", "FastAPI", "PostgreSQL"]],
        description="Technologies used",
    )
    atual: bool = Field(
        default=False,
        description="Whether this is the current position",
    )


class RespostaExperiencias(BaseModel):
    """
    Resposta da listagem de experiências.

    Attributes:
        experiencias: Lista de experiências ordenadas por data.
        total: Quantidade total de experiências.
    """

    experiencias: list[Experiencia] = Field(
        ...,
        description="List of professional experiences",
    )
    total: int = Field(
        ...,
        ge=0,
        examples=[2],
        description="Total number of experiences",
    )
