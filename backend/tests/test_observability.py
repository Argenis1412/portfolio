"""Observability follows explicit configuration, independently of pytest."""

import subprocess
import sys
from unittest.mock import patch

import pytest
from fastapi import FastAPI

from app import __version__
from app.core.observability import _setup_opentelemetry, setup_observability
from app.settings import Settings


@pytest.mark.parametrize("enabled", [True, False])
def test_otel_toggle_preserves_other_observability(enabled):
    app = FastAPI()
    settings = Settings(_env_file=None, OTEL_ENABLED=enabled)
    with (
        patch("app.core.observability._setup_sentry") as sentry,
        patch("app.core.observability._setup_prometheus") as prometheus,
        patch("app.core.observability._setup_opentelemetry") as otel,
    ):
        setup_observability(app, settings)

    sentry.assert_called_once_with(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
    )
    prometheus.assert_called_once_with(app)
    if enabled:
        otel.assert_called_once_with(
            app=app,
            service_name=settings.app_name,
            version=__version__,
            environment=settings.environment,
            otlp_endpoint=settings.otlp_endpoint,
        )
    else:
        otel.assert_not_called()


@pytest.mark.parametrize(
    "value,expected", [("true", True), ("false", False), (None, True)]
)
def test_otel_setting_from_environment(monkeypatch, value, expected):
    if value is None:
        monkeypatch.delenv("OTEL_ENABLED", raising=False)
    else:
        monkeypatch.setenv("OTEL_ENABLED", value)

    assert Settings(_env_file=None).otel_enabled is expected


@pytest.mark.parametrize(
    "environment,endpoint,expected_endpoint",
    [
        ("local", "", "console"),
        ("production", "", None),
        (
            "production",
            " https://collector.example/ ",
            "https://collector.example/v1/traces",
        ),
        (
            "production",
            "https://collector.example/v1/traces",
            "https://collector.example/v1/traces",
        ),
        ("production", "https://sentry.io/", None),
    ],
)
def test_trace_exporter_selection(environment, endpoint, expected_endpoint):
    app = FastAPI()
    with (
        patch("opentelemetry.sdk.trace.TracerProvider") as provider,
        patch("opentelemetry.trace.set_tracer_provider") as register_provider,
        patch(
            "opentelemetry.instrumentation.fastapi.FastAPIInstrumentor"
        ) as instrumentor,
        patch("opentelemetry.sdk.trace.export.BatchSpanProcessor") as processor,
        patch("opentelemetry.sdk.trace.export.ConsoleSpanExporter") as console,
        patch(
            "opentelemetry.exporter.otlp.proto.http.trace_exporter.OTLPSpanExporter"
        ) as otlp,
    ):
        _setup_opentelemetry(app, "test-service", "1.0", environment, endpoint)

    if expected_endpoint is None:
        console.assert_not_called()
        otlp.assert_not_called()
        processor.assert_not_called()
    else:
        if expected_endpoint == "console":
            console.assert_called_once_with()
            otlp.assert_not_called()
            exporter = console.return_value
        else:
            otlp.assert_called_once_with(endpoint=expected_endpoint)
            console.assert_not_called()
            exporter = otlp.return_value
        processor.assert_called_once_with(exporter)
        provider.return_value.add_span_processor.assert_called_once_with(
            processor.return_value
        )
        register_provider.assert_called_once_with(provider.return_value)
        instrumentor.return_value.instrument_app.assert_called_once()
        call = instrumentor.return_value.instrument_app.call_args
        assert call.args == (app,)
        assert call.kwargs["tracer_provider"] is provider.return_value


@pytest.mark.parametrize("redis_url", ["", "memory://", "redis://localhost:6379/0"])
def test_rate_limiter_uses_configured_storage_under_pytest(monkeypatch, redis_url):
    monkeypatch.setenv("REDIS_URL", redis_url)
    monkeypatch.setenv("PYTEST_CURRENT_TEST", "explicit-configuration-test")
    storage_class = (
        "RedisStorage" if redis_url.startswith("redis://") else "MemoryStorage"
    )
    # A fresh interpreter exercises import-time configuration without re-registering metrics.
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from app.core.rate_limit import limiter; "
            f"from limits.storage import {storage_class}; "
            f"assert isinstance(limiter._storage, {storage_class})",
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
