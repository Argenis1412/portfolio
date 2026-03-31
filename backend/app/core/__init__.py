"""
Módulo core da aplicação.

Contém funcionalidades transversais:
- Exceções customizadas
- Handlers de erros
- Middleware
- Utilitários compartilhados
"""

from app.core.excecoes import (
    ErroDominio,
    ErroValidacao,
    ErroInfraestrutura,
    ErroRecursoNaoEncontrado,
)
from app.core.handlers import registrar_handlers_excecao

__all__ = [
    "ErroDominio",
    "ErroValidacao",
    "ErroInfraestrutura",
    "ErroRecursoNaoEncontrado",
    "registrar_handlers_excecao",
]
