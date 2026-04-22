"""
Adapter for structured logging.

Abstract interface + implementation with structlog for structured logs.
"""

import sys
from abc import ABC, abstractmethod
from typing import Any

import structlog

_structlog_configured = False


def configure_structlog() -> None:
    global _structlog_configured
    if _structlog_configured:
        return
    _structlog_configured = True
    """
    Configures structlog with suitable processors for production.

    Processors:
        - add_log_level: Adds log level
        - add_logger_name: Adds logger name
        - TimeStamper: Adds ISO 8601 timestamp
        - StackInfoRenderer: Renders stack traces
        - format_exc_info: Formats exceptions
        - JSONRenderer (production) or ConsoleRenderer (dev)
    """
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            # JSON for production, Console for development
            structlog.dev.ConsoleRenderer()
            if sys.stderr.isatty()
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


class LoggerAdapter(ABC):
    """
    Abstract interface for logging.

    Allows easy implementation swaps (logging → structlog → sentry).
    """

    @abstractmethod
    def info(self, message: str, **kwargs: Any) -> None:
        """Logs an info message."""
        pass

    @abstractmethod
    def error(self, message: str, **kwargs: Any) -> None:
        """Logs an error message."""
        pass

    @abstractmethod
    def warning(self, message: str, **kwargs: Any) -> None:
        """Logs a warning message."""
        pass

    @abstractmethod
    def debug(self, message: str, **kwargs: Any) -> None:
        """Logs a debug message."""
        pass


class StructuredLogger(LoggerAdapter):
    """
    LoggerAdapter implementation using structlog.

    Attributes:
        logger: structlog logger instance.
    """

    def __init__(self, name: str = "portfolio"):
        """
        Initializes structured logger.

        Args:
            name: Logger name (used for identification).
        """
        configure_structlog()
        self.logger = structlog.get_logger(name)

    def info(self, message: str, **kwargs: Any) -> None:
        """
        Logs a structured info message.

        Args:
            message: Message to log.
            **kwargs: Additional context (structured fields).
        """
        self.logger.info(message, **kwargs)

    def error(self, message: str, **kwargs: Any) -> None:
        """
        Logs a structured error message.

        Args:
            message: Message to log.
            **kwargs: Additional context (structured fields).
        """
        self.logger.error(message, **kwargs)

    def warning(self, message: str, **kwargs: Any) -> None:
        """
        Logs a structured warning message.

        Args:
            message: Message to log.
            **kwargs: Additional context (structured fields).
        """
        self.logger.warning(message, **kwargs)

    def debug(self, message: str, **kwargs: Any) -> None:
        """
        Logs a structured debug message.

        Args:
            message: Message to log.
            **kwargs: Additional context (structured fields).
        """
        self.logger.debug(message, **kwargs)
