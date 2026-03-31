"""
Schemas para endpoints /api/projetos e /api/projetos/{id}.

Define contratos para listagem e detalhes de projetos.
"""

from pydantic import BaseModel, Field, HttpUrl

from app.esquemas.tipos_base import TextoLocalizado


class ProjetoResumo(BaseModel):
    """
    Resumo de projeto para listagem.

    Usado no endpoint GET /api/projetos.
    """

    id: str = Field(
        ...,
        examples=["portfolio-api"],
        description="Project unique identifier",
    )
    nome: str = Field(
        ...,
        max_length=100,
        examples=["Portfolio API"],
        description="Project name",
    )
    descricao_curta: TextoLocalizado = Field(
        ...,
        description="Brief project description in PT, EN and ES",
    )
    tecnologias: list[str] = Field(
        ...,
        examples=[["Python", "FastAPI", "Pydantic"]],
        description="Technologies used",
    )
    destaque: bool = Field(
        default=False,
        description="Whether the project should be highlighted",
    )
    repositorio: HttpUrl | None = Field(
        default=None,
        examples=["https://github.com/Argenis1412/portfolio"],
        description="Repository URL",
    )
    demo: HttpUrl | None = Field(
        default=None,
        examples=["https://portfolio-api.railway.app"],
        description="Live demo URL",
    )
    imagem: HttpUrl | None = Field(
        default=None,
        description="Cover image URL",
    )


class ProjetoDetalhado(BaseModel):
    """
    Detalhes completos de um projeto.

    Usado no endpoint GET /api/projetos/{id}.
    """

    id: str = Field(
        ...,
        examples=["portfolio-api"],
        description="Project unique identifier",
    )
    nome: str = Field(
        ...,
        max_length=100,
        examples=["Portfolio API"],
        description="Project name",
    )
    descricao_curta: TextoLocalizado = Field(
        ...,
        description="Brief project description in PT, EN and ES",
    )
    descricao_completa: TextoLocalizado = Field(
        ...,
        description="Full project description in PT, EN and ES",
    )
    tecnologias: list[str] = Field(
        ...,
        examples=[["Python", "FastAPI", "Pydantic", "Pytest"]],
        description="Technologies used",
    )
    funcionalidades: list[str] = Field(
        ...,
        examples=[["Health check", "Project CRUD", "Validation"]],
        description="Main features",
    )
    aprendizados: list[str] = Field(
        ...,
        examples=[["Clean Architecture", "Unit testing"]],
        description="Key learnings from the project",
    )
    repositorio: HttpUrl | None = Field(
        default=None,
        examples=["https://github.com/Argenis1412/portfolio"],
        description="Repository URL",
    )
    demo: HttpUrl | None = Field(
        default=None,
        examples=["https://portfolio-api.railway.app"],
        description="Live demo URL",
    )
    destaque: bool = Field(
        default=False,
        description="Whether the project should be highlighted",
    )
    imagem: HttpUrl | None = Field(
        default=None,
        description="Cover image URL",
    )


class RespostaProjetos(BaseModel):
    """
    Resposta da listagem de projetos.

    Attributes:
        projetos: Lista de projetos resumidos.
        total: Quantidade total de projetos.
    """

    projetos: list[ProjetoResumo] = Field(
        ...,
        description="List of projects",
    )
    total: int = Field(
        ...,
        ge=0,
        examples=[3],
        description="Total number of projects",
    )