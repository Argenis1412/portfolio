"""
Schemas para endpoint /api/sobre.

Define o contrato de resposta com informações pessoais do desenvolvedor.
"""

from pydantic import BaseModel, Field, EmailStr, HttpUrl

from app.esquemas.tipos_base import TextoLocalizado


class RespostaSobre(BaseModel):
    """
    Informações pessoais para seção "Sobre Mim".

    Attributes:
        nome: Nome completo do desenvolvedor.
        titulo: Título profissional.
        localizacao: Cidade e estado.
        email: Email de contato.
        telefone: Telefone de contato.
        github: URL do perfil GitHub.
        linkedin: URL do perfil LinkedIn.
        descricao: Resumo profissional (internacionalizado).
        disponibilidade: Disponibilidade para trabalho (internacionalizado).
    """

    nome: str = Field(
        ...,
        min_length=2,
        max_length=100,
        examples=["Argenis Lopez"],
        description="Full name",
    )
    titulo: str = Field(
        ...,
        max_length=200,
        examples=["Backend Developer | Python | FastAPI"],
        description="Professional title",
    )
    localizacao: str = Field(
        ...,
        max_length=100,
        examples=["Curitiba, PR"],
        description="Current location",
    )
    email: EmailStr = Field(
        ...,
        examples=["argenislopez28708256@gmail.com"],
        description="Contact email",
    )
    telefone: str = Field(
        ...,
        max_length=20,
        examples=["(41) 9 9510-3364"],
        description="Contact phone",
    )
    github: HttpUrl = Field(
        ...,
        examples=["https://github.com/Argenis1412"],
        description="GitHub profile URL",
    )
    linkedin: HttpUrl = Field(
        ...,
        examples=["https://linkedin.com/in/argenis972"],
        description="LinkedIn profile URL",
    )
    descricao: TextoLocalizado = Field(
        ...,
        description="Professional summary in PT, EN and ES",
    )
    disponibilidade: TextoLocalizado = Field(
        ...,
        description="Work availability preference in PT, EN and ES",
    )
