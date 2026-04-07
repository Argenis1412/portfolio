# Production Operations Hardening

This document defines the minimum operational requirements for a secure and scalable production deployment.

## 1. Required Production Variables

The backend now expects the following variables when `AMBIENTE=producao`:

- `DATABASE_URL`: must use `postgresql+asyncpg://` and point to managed PostgreSQL.
- `REDIS_URL`: required for distributed rate limiting, idempotency, and contact deduplication.
- `METRICS_BASIC_AUTH_USERNAME`: basic auth username for `/metrics`.
- `METRICS_BASIC_AUTH_PASSWORD`: basic auth password for `/metrics`.

Optional but recommended:

- `FORMSPREE_TIMEOUT_SECONDS`
- `REDIS_SOCKET_TIMEOUT_SECONDS`
- `REDIS_CONNECT_TIMEOUT_SECONDS`
- `DB_CONNECT_TIMEOUT_SECONDS`
- `DB_COMMAND_TIMEOUT_SECONDS`
- `SENTRY_DSN`
- `OTLP_ENDPOINT`

## 2. Secret Rotation Runbook

Rotate secrets immediately when a value is exposed in logs, screenshots, chat, or browser history.

Rotation order:

1. Rotate the secret at the provider.
2. Update the corresponding environment variable in Koyeb/Vercel.
3. Redeploy the affected service.
4. Validate `/live`, `/saude`, and a real contact submission.
5. Close the incident only after confirming old credentials no longer work.

Priority secrets:

1. Supabase database password
2. Redis token / password
3. Metrics basic auth credentials
4. Formspree credentials or form identifiers
5. Sentry DSN if the project scope changes

## 3. Metrics Access Policy

`/metrics` must not be public in production.

Current policy:

- Local and test environments: open access
- Production: HTTP Basic Auth required

## 4. Minimum Alerts

Recommended alert thresholds:

1. `5xx rate > 2% for 5 minutes`
2. `P95 latency > 1.5s for 10 minutes`
3. `contact delivery failures > 5 in 10 minutes`
4. `database connection errors > 3 in 5 minutes`
5. `redis connection errors > 3 in 5 minutes`

Suggested destinations:

- Sentry for exceptions and contact failures
- Prometheus/Grafana for latency, traffic, and infrastructure thresholds

## 5. Readiness and Liveness

- `/live`: process liveness only
- `/saude`: readiness with real dependency checks

Use `/live` for lightweight probes and `/saude` for production diagnostics.

## 6. Tracing (Jaeger/OTLP) Roadmap

- Sentry tracing já funciona via `SENTRY_DSN` (não use o OTLP de Sentry no `OTLP_ENDPOINT`).
- Atualmente, se `OTLP_ENDPOINT` estiver vazio em produção, spans não serão exportados (Console exporter desativado) para evitar ruído.
- Para usar Jaeger/Tempo públicos, configure `OTLP_ENDPOINT` com um endpoint HTTP acessível (ex.: `https://<host>:4318`). O Jaeger local em `localhost:4318` não é acessível a partir do Koyeb.
