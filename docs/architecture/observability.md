# ADR: Observability Implementation (Sentry, Prometheus, OpenTelemetry)

## Context and Problem Statement
A professional backend system lacks visibility into runtime behavior without proper observability. We need a way to track errors, monitor performance, and trace request lifecycles in a production environment (Koyeb/Vercel).

## Decision Drivers
- **Resilience**: Need to catch and triage errors before users report them.
- **Performance**: Monitor P95 latency and bottleneck identification.
- **Supportability**: Tracing requests across the stack.

## Considered Options
1. **Plain Logging**: Standardized logs but lacks real-time alerting and metrics.
2. **Custom Monitoring Logic**: High maintenance effort.
3. **Full Observability Stack (Selected)**: Combining specialized tools.

## Decision Outcome
Selected **Sentry**, **Prometheus**, and **OpenTelemetry** as the observability trio:

### 1. Sentry (Error & Tracing)
- **Why**: Industry standard for real-time error tracking and performance profiling.
- **Implementation**: Frontend (React) and Backend (FastAPI) SDKs integrated.
- **Result**: Automatic capture of stack traces and breadcrumbs.

### 2. Prometheus (Metrics)
- **Why**: Standard for time-series metrics using a pull-based model.
- **Implementation**: `/metrics` endpoint provided via slowapi/pydantic middleware.
- **Result**: Live tracking of request counts, error rates, and latency buckets.

### 4. Frontend Telemetry Reconciliation Layer
- **Why**: Chaos controls must visibly affect the dashboard immediately, but the UI must not misrepresent synthetic projections as backend truth.
- **Implementation**: The frontend now appends a short-lived synthetic P95 sample whenever a chaos trace is emitted, marks it as `synthetic`, and reconciles it with the next successful `/metrics/summary` poll marked as `real`.
- **Result**: Operators see coherent telemetry during manual chaos actions, along with confidence and source metadata that prevent misleading "instant backend" claims.

### 3. OpenTelemetry (Tracing)
- **Why**: Vendor-neutral standard for distributed tracing.
- **Implementation**: Instrumented FastAPI middleware to generate Span IDs.
- **Result**: Observability into exactly where a request spends its time.

## Pros and Cons
- **Pros**: Production-ready visibility, easier debugging, better scalability.
- **Cons**: Small overhead in response time and complexity in initialization.

## Consequences
- The telemetry sparkline intentionally shows two classes of data: backend-confirmed samples and synthetic projections.
- UI state such as lifecycle (`NORMAL`, `DEGRADED`, `RECOVERING`) may temporarily reflect synthetic chaos projections before the backend poll catches up.
- Confidence indicators are required anywhere synthetic data can temporarily influence user-facing metrics.

## Next Steps
- Integrate Grafana dashboards to visualize Prometheus metrics.
- Fine-tune Sentry sample rates to optimize performance.
