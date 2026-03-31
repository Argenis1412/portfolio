"""
Adaptador para logging estruturado.

Interface abstrata + implementação com structlog para logs estruturados.
"""

from abc import ABC, abstractmethod
import sys
from typing import Any
import structlog


def configurar_structlog() -> None:
    """
    Configura structlog com processadores adequados para produção.
    
    Processadores:
        - add_log_level: Adiciona nível do log
        - add_logger_name: Adiciona nome do logger
        - TimeStamper: Adiciona timestamp ISO 8601
        - StackInfoRenderer: Renderiza stack traces
        - format_exc_info: Formata exceções
        - JSONRenderer (produção) ou ConsoleRenderer (dev)
    """
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            # JSON para produção, Console para desenvolvimento
            structlog.dev.ConsoleRenderer()
            if sys.stderr.isatty()
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


class LoggerAdaptador(ABC):
    """
    Interface abstrata para logging.

    Permite trocar implementação facilmente (logging → structlog → sentry).
    """

    @abstractmethod
    def info(self, mensagem: str, **kwargs: Any) -> None:
        """Loga mensagem de informação."""
        pass

    @abstractmethod
    def erro(self, mensagem: str, **kwargs: Any) -> None:
        """Loga mensagem de erro."""
        pass

    @abstractmethod
    def aviso(self, mensagem: str, **kwargs: Any) -> None:
        """Loga mensagem de aviso."""
        pass

    @abstractmethod
    def debug(self, mensagem: str, **kwargs: Any) -> None:
        """Loga mensagem de debug."""
        pass


class LoggerEstruturado(LoggerAdaptador):
    """
    Implementação de LoggerAdaptador usando structlog.

    Attributes:
        logger: Instância do logger structlog.
    """

    def __init__(self, nome: str = "portfolio"):
        """
        Inicializa logger estruturado.

        Args:
            nome: Nome do logger (usado para identificação).
        """
        configurar_structlog()
        self.logger = structlog.get_logger(nome)

    def info(self, mensagem: str, **kwargs: Any) -> None:
        """
        Loga mensagem de informação estruturada.

        Args:
            mensagem: Mensagem a logar.
            **kwargs: Contexto adicional (fields estruturados).
        """
        self.logger.info(mensagem, **kwargs)

    def erro(self, mensagem: str, **kwargs: Any) -> None:
        """
        Loga mensagem de erro estruturada.

        Args:
            mensagem: Mensagem a logar.
            **kwargs: Contexto adicional (fields estruturados).
        """
        self.logger.error(mensagem, **kwargs)

    def aviso(self, mensagem: str, **kwargs: Any) -> None:
        """
        Loga mensagem de aviso estruturada.

        Args:
            mensagem: Mensagem a logar.
            **kwargs: Contexto adicional (fields estruturados).
        """
        self.logger.warning(mensagem, **kwargs)

    def debug(self, mensagem: str, **kwargs: Any) -> None:
        """
        Loga mensagem de debug estruturada.

        Args:
            mensagem: Mensagem a logar.
            **kwargs: Contexto adicional (fields estruturados).
        """
        self.logger.debug(mensagem, **kwargs)
