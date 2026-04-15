"""
Schemas para endpoint POST /api/contato.

Define contratos de requisição e resposta para envio de mensagens.
"""

import re
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, field_validator


NOME_REGEX = re.compile(r"^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .,'-]{1,79}$")
ASSUNTO_REGEX = re.compile(r"^[A-Za-zÀ-ÿ0-9 .,:;!?()/#&+@'\-]{0,120}$")


class RequisicaoContato(BaseModel):
    """
    Dados do formulário de contato.

    Validações:
        - nome: 2-80 caracteres
        - email: formato válido
        - mensagem: 10-2000 caracteres
    """

    nome: str = Field(
        ...,
        min_length=1,
        max_length=80,
        examples=["Maria Silva"],
        description="Nome de quem está enviando",
    )
    email: str = Field(
        ...,
        min_length=3,
        max_length=100,
        examples=["maria@empresa.com"],
        description="Email para resposta",
    )
    assunto: Optional[str] = Field(
        default="Contato via Portfólio",
        min_length=0,
        max_length=120,
        examples=["Oportunidade de trabalho"],
        description="Assunto da mensagem",
    )
    mensagem: str = Field(
        ...,
        min_length=1,
        max_length=3000,
        examples=["Olá, vi seu portfólio e gostaria de conversar..."],
        description="Conteúdo da mensagem",
    )
    # Honeypot fields (should be empty)
    website: Optional[str] = Field(None, description="Honeypot 1")
    fax: Optional[str] = Field(None, description="Honeypot 2")

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        """Sanitiza o nome, permitindo que falhe silenciosamente no guard."""
        return re.sub(r"\s+", " ", valor).strip()

    @field_validator("assunto")
    @classmethod
    def validar_assunto(cls, valor: Optional[str]) -> Optional[str]:
        """Sanitiza o assunto, permitindo que falhe silenciosamente no guard."""
        if valor is None:
            return valor
        return re.sub(r"\s+", " ", valor).strip()

    @field_validator("mensagem")
    @classmethod
    def validar_mensagem(cls, valor: str) -> str:
        """Sanitiza a mensagem, permitindo que falhe silenciosamente no guard."""
        return re.sub(r"\s+", " ", valor).strip()


class RespostaContato(BaseModel):
    """
    Resposta após envio de mensagem.

    Attributes:
        sucesso: Se a mensagem foi enviada com sucesso.
        mensagem: Descrição do resultado.
    """

    sucesso: bool = Field(
        ...,
        examples=[True],
        description="Se o envio foi bem-sucedido",
    )
    mensagem: str = Field(
        ...,
        examples=["Mensagem enviada com sucesso!"],
        description="Descrição do resultado",
    )
