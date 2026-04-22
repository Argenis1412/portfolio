"""
Core application module.

Contains cross-cutting functionalities:
- Custom exceptions
- Error handlers
- Middleware
- Shared utilities
"""

from app.core.exceptions import (
    DomainError,
    InfrastructureError,
    ResourceNotFoundError,
    ValidationError,
)
from app.core.handlers import register_exception_handlers

__all__ = [
    "DomainError",
    "ValidationError",
    "InfrastructureError",
    "ResourceNotFoundError",
    "register_exception_handlers",
]
