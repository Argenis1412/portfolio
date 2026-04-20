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
    ErroInfraestrutura,
    ErroRecursoNaoEncontrado,
    ErroValidacao,
)
from app.core.handlers import registrar_handlers_excecao

__all__ = [
    "ErroDominio",
    "ErroValidacao",
    "ErroInfraestrutura",
    "ErroRecursoNaoEncontrado",
    "registrar_handlers_excecao",
]
