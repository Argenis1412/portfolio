"""
Adaptadores para serviços externos.

Responsabilidade:
- Abstrair dependências externas (APIs, storage, logs)
- Permitir fácil substituição de implementações
- Isolar lógica de negócio de detalhes técnicos

Padrão: Interface (ABC) + Implementação concreta.
"""

from app.adaptadores.email_adaptador import (
    EmailAdaptador,
    FormspreeEmailAdaptador,
    ResendEmailAdaptador,
)
from app.adaptadores.logger_adaptador import LoggerAdaptador, LoggerEstruturado
from app.adaptadores.repositorio import RepositorioJSON, RepositorioPortfolio
from app.adaptadores.repositorio_sql import RepositorioSQL

__all__ = [
    "EmailAdaptador",
    "FormspreeEmailAdaptador",
    "ResendEmailAdaptador",
    "RepositorioPortfolio",
    "RepositorioJSON",
    "RepositorioSQL",
    "LoggerAdaptador",
    "LoggerEstruturado",
]
