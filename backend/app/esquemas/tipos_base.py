"""
Tipos base reutilizáveis para todos os esquemas.

Define modelos Pydantic compartilhados que garantem consistência
nos contratos de resposta da API.
"""

from pydantic import BaseModel, Field


class TextoLocalizado(BaseModel):
    """
    Texto disponível em múltiplos idiomas.

    Usado para campos de conteúdo que o frontend pode exibir
    de acordo com a preferência do usuário (PT / EN / ES).

    Attributes:
        pt: Texto em português.
        en: Texto em inglês.
        es: Texto em espanhol.
    """

    pt: str = Field(..., description="Portuguese text")
    en: str = Field(..., description="English text")
    es: str = Field(..., description="Spanish text")
