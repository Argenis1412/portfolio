"""
Schemas para endpoint POST /api/contato.

Define contratos de requisição e resposta para envio de mensagens.
"""

from typing import Optional
from pydantic import BaseModel, Field, EmailStr


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
        min_length=2,
        max_length=80,
        examples=["Maria Silva"],
        description="Nome de quem está enviando",
    )
    email: EmailStr = Field(
        ...,
        examples=["maria@empresa.com"],
        description="Email para resposta",
    )
    assunto: Optional[str] = Field(
        default="Contato via Portfólio",
        min_length=0,
        max_length=100,
        examples=["Oportunidade de trabalho"],
        description="Assunto da mensagem",
    )
    mensagem: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        examples=["Olá, vi seu portfólio e gostaria de conversar..."],
        description="Conteúdo da mensagem",
    )
    # Honeypot fields (should be empty)
    website: Optional[str] = Field(None, description="Honeypot 1")
    fax: Optional[str] = Field(None, description="Honeypot 2")


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