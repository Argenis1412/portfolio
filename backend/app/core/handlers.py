"""
Global exception handlers.

Converts custom exceptions into standardized HTTP responses.
Automatically registered during application startup.
"""

from typing import Any

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import (
    DomainError,
    InfrastructureError,
    ResourceNotFoundError,
    ValidationError,
)
from app.core.idempotency import IdempotencyException

logger = structlog.get_logger(__name__)


def create_error_response(
    code: str,
    message: str,
    status_code: int,
    details: Any = None,
    trace_id: str | None = None,
) -> JSONResponse:
    """
    Creates a standardized JSON error response.

    Args:
        code: Internal error code.
        message: Descriptive message.
        status_code: HTTP code.
        details: Additional information (optional).
        trace_id: Request ID for tracing.

    Returns:
        JSONResponse: Formatted response.
    """
    content = {
        "error": {
            "code": code,
            "message": message,
        }
    }

    if details:
        content["error"]["details"] = details

    if trace_id:
        content["error"]["trace_id"] = trace_id

    return JSONResponse(
        status_code=status_code,
        content=content,
    )


async def domain_error_handler(
    request: Request,
    exc: DomainError,
) -> JSONResponse:
    """
    Handles domain/business errors.
    """
    logger.warning(
        "domain_error",
        message=exc.message,
        code=exc.code,
        path=request.url.path,
    )

    return create_error_response(
        code=exc.code,
        message=exc.message,
        status_code=status.HTTP_400_BAD_REQUEST,
        trace_id=getattr(request.state, "request_id", None),
    )


async def validation_error_handler(
    request: Request,
    exc: ValidationError,
) -> JSONResponse:
    """
    Handles business validation errors.
    """
    logger.warning(
        "business_validation_error",
        message=exc.message,
        code=exc.code,
        path=request.url.path,
    )

    return create_error_response(
        code=exc.code,
        message=exc.message,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        trace_id=getattr(request.state, "request_id", None),
    )


async def infrastructure_error_handler(
    request: Request,
    exc: InfrastructureError,
) -> JSONResponse:
    """
    Handles external infrastructure errors.
    """
    logger.error(
        "infrastructure_error",
        message=exc.message,
        code=exc.code,
        origin=exc.origin,
        path=request.url.path,
        exc_info=True,
    )

    # Do not expose internal details in production
    return create_error_response(
        code="INTERNAL_ERROR",
        message="Internal server error. Please try again later.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        trace_id=getattr(request.state, "request_id", None),
    )


async def resource_not_found_handler(
    request: Request,
    exc: ResourceNotFoundError,
) -> JSONResponse:
    """
    Handles resource not found errors.
    """
    logger.info(
        "resource_not_found",
        message=exc.message,
        code=exc.code,
        path=request.url.path,
    )

    return create_error_response(
        code=exc.code,
        message=exc.message,
        status_code=status.HTTP_404_NOT_FOUND,
        trace_id=getattr(request.state, "request_id", None),
    )


async def pydantic_validation_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """
    Handles Pydantic validation errors.
    """
    formatted_errors = []

    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        formatted_errors.append(
            {
                "field": field,
                "message": error["msg"],
                "type": error["type"],
            }
        )

    logger.warning(
        "pydantic_validation_error",
        total_invalid_fields=len(formatted_errors),
        path=request.url.path,
        errors=formatted_errors,
    )

    return create_error_response(
        code="INPUT_VALIDATION_ERROR",
        message="Invalid input data",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=formatted_errors,
        trace_id=getattr(request.state, "request_id", None),
    )


async def generic_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """
    Fallback for unhandled exceptions.
    """
    logger.error(
        "unhandled_exception",
        error_type=type(exc).__name__,
        error=str(exc),
        path=request.url.path,
        exc_info=True,
    )

    return create_error_response(
        code="UNEXPECTED_ERROR",
        message="Unexpected error. The team has been notified.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        trace_id=getattr(request.state, "request_id", None),
    )


async def rate_limit_handler(
    request: Request,
    exc: RateLimitExceeded,
) -> JSONResponse:
    """
    Handles rate limit exceeded errors.
    """
    logger.warning(
        "rate_limit_exceeded",
        path=request.url.path,
        details=str(exc),
    )

    return create_error_response(
        code="RATE_LIMIT_EXCEEDED",
        message=f"Rate limit exceeded. {str(exc)}",
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        trace_id=getattr(request.state, "request_id", None),
    )


async def idempotency_handler(
    request: Request,
    exc: IdempotencyException,
) -> JSONResponse:
    """
    Handles idempotency exception by returning the cached response.
    """
    logger.info(
        "idempotency_cache_hit",
        path=request.url.path,
        status_code=exc.record.status_code,
    )

    return JSONResponse(
        status_code=exc.record.status_code,
        content=exc.record.content,
        headers={"X-Cache-Idempotency": "HIT"},
    )


async def starlette_http_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    """
    Handles Starlette HTTP exceptions (e.g., 404 route not found).
    """
    return create_error_response(
        code="HTTP_ERROR",
        message=str(exc.detail),
        status_code=exc.status_code,
        trace_id=getattr(request.state, "request_id", None),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """
    Registers all exception handlers in the application.

    Args:
        app: FastAPI instance.
    """
    app.add_exception_handler(DomainError, domain_error_handler)  # type: ignore
    app.add_exception_handler(ValidationError, validation_error_handler)  # type: ignore
    app.add_exception_handler(InfrastructureError, infrastructure_error_handler)  # type: ignore
    app.add_exception_handler(ResourceNotFoundError, resource_not_found_handler)  # type: ignore
    app.add_exception_handler(RequestValidationError, pydantic_validation_handler)  # type: ignore
    app.add_exception_handler(IdempotencyException, idempotency_handler)  # type: ignore
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)  # type: ignore
    app.add_exception_handler(StarletteHTTPException, starlette_http_handler)  # type: ignore
    app.add_exception_handler(Exception, generic_handler)  # type: ignore

    logger.info("Exception handlers registered successfully")
