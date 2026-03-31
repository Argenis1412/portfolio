"""
Schemas para endpoint /api/stack.

Define contratos para listagem de tecnologias organizadas por categoria.
"""

from pydantic import BaseModel, Field
from enum import Enum


class CategoriaStack(str, Enum):
    """
    Categorias possíveis para tecnologias.
    """

    BACKEND = "backend"
    FRONTEND = "frontend"
    BANCO_DADOS = "banco_dados"
    DEVOPS = "devops"
    FERRAMENTAS = "ferramentas"


class ItemStack(BaseModel):
    """
    Uma tecnologia do stack.

    Attributes:
        nome: Nome da tecnologia.
        categoria: Categoria da tecnologia.
        nivel: Nível de conhecimento (1-5).
        icone: Nome do ícone (opcional, para frontend).
    """

    nome: str = Field(
        ...,
        max_length=50,
        examples=["Python"],
        description="Nome da tecnologia",
    )
    categoria: CategoriaStack = Field(
        ...,
        examples=[CategoriaStack.BACKEND],
        description="Categoria da tecnologia",
    )
    nivel: int = Field(
        ...,
        ge=1,
        le=5,
        examples=[4],
        description="Nível de conhecimento (1=básico, 5=avançado)",
    )
    icone: str | None = Field(
        default=None,
        max_length=50,
        examples=["python"],
        description="Nome do ícone para o frontend",
    )


class RespostaStack(BaseModel):
    """
    Resposta da listagem de stack técnico.

    Attributes:
        stack: Lista de tecnologias.
        por_categoria: Tecnologias agrupadas por categoria.
    """

    stack: list[ItemStack] = Field(
        ...,
        description="Lista completa de tecnologias",
    )
    por_categoria: dict[str, list[ItemStack]] = Field(
        ...,
        description="Tecnologias agrupadas por categoria",
    )