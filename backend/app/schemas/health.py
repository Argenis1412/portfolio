"""
Pydantic schemas for health endpoint.

Defines input/output contracts for automatic validation.
"""

from typing import Any, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """
    Health check response schema.

    Attributes:
        status: API Status ("ok" or "error").
        message: Human-readable status description.
        api_version: API Version.
        environment: Execution environment.
        uptime_seconds: Time since startup (optional).
        details: Optional component details.
    """

    status: str = Field(
        ...,
        examples=["ok"],
        description="API status",
    )
    message: str = Field(
        ...,
        examples=["API functioning normally"],
        description="Human-readable status message",
    )
    api_version: str = Field(
        ...,
        examples=["1.0.0"],
        description="API version",
    )
    environment: str = Field(
        ...,
        examples=["local", "staging", "production"],
        description="Execution environment",
    )
    uptime_seconds: int | None = Field(
        default=None,
        examples=[3600],
        description="Seconds since initialization",
    )
    details: Optional[dict[str, Any]] = Field(
        default=None,
        description="Component status details",
    )


class MetricsSummary(BaseModel):
    """
    Simplified schema for frontend evidence dashboard.
    """

    p95_ms: int = Field(
        ...,
        examples=[43],
        description="P95 latency in ms (histogram bucket interpolation)",
    )
    p95_status: str = Field(
        ...,
        examples=["healthy", "degraded", "warming_up"],
        description="Latency status — warming_up during the first 90 seconds or with fewer than 5 samples",
    )
    requests_since_deploy: int = Field(
        ...,
        examples=[987],
        description="Total requests since process start (from Prometheus counter)",
    )
    error_rate: float = Field(
        ..., examples=[0.0131], description="Decimal error rate (5xx / total)"
    )
    error_rate_pct: str = Field(
        ..., examples=["1.31%"], description="Formatted error rate"
    )
    error_rate_status: str = Field(
        ...,
        examples=["stable", "warning", "warming_up"],
        description="Error rate status — warming_up during the first 90 seconds or with fewer than 5 samples",
    )
    system_status: str = Field(
        ..., examples=["operational"], description="Overall system state"
    )
    uptime: str = Field(
        ..., examples=["2h 14m"], description="Formatted process uptime"
    )
    window: str = Field(
        ..., examples=["since_deploy"], description="Metrics time window"
    )
    timestamp: str = Field(..., description="ISO 8601 reading timestamp")
