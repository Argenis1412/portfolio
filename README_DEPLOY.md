# Portfolio Deployment Guide

Standard Operating Procedure for deploying the Full-Stack Portfolio with a focus on zero-cost, high performance, and permanent availability.

## 🚀 Backend Infrastructure (Koyeb)
Scalable Python API hosting.

1.  **Source**: Connect your GitHub repository.
2.  **Service Configuration**:
    *   **Root Directory**: `/backend`
    *   **Instance Type**: `Nano` (512MB RAM - Permanent Free Tier)
    *   **Start Command**: `alembic upgrade head && python scripts/migrar_dados.py && uvicorn app.principal:app --host 0.0.0.0 --port 8000`
    *   **Port Visibility**: Expose port `8000` (HTTP)
3.  **Environment Variables**:

    | Variable | Required | Description |
    |---|---|---|
    | `FORMSPREE_FORM_ID` | ✅ Yes | Formspree form ID (e.g. `xzdjqvok`) |
    | `AMBIENTE` | ✅ Yes | Set to `producao` |
    | `SENTRY_DSN` | ⭐ Recommended | Sentry DSN for error tracking (see Sentry project settings) |
    | `SENTRY_TRACES_SAMPLE_RATE` | Optional | Transaction sample rate `0.0–1.0` (default: `0.2`) |
    | `OTLP_ENDPOINT` | Optional | OTLP endpoint for distributed traces (e.g. Grafana Cloud) |

---

## 💻 Frontend Interface (Vercel)
Global Edge UI deployment.

1.  **Source**: Connect the same GitHub repository.
2.  **Project Configuration**:
    *   **Framework Preset**: `Vite`
    *   **Root Directory**: `/frontend`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
3.  **Environment Variables**:
    *   `VITE_API_URL`: `https://selected-fionna-argenis1412-58caae17.koyeb.app/api/v1`
    *   **Swagger Prod**: `https://selected-fionna-argenis1412-58caae17.koyeb.app/docs` (Koyeb)

---

## 🛠️ Architecture Notes
*   **Database (SQLite)**: We do **not** commit `portfolio.db` to Git. Committing a binary database is an anti-pattern that bloats repository history and risks exposing sensitive data. Instead, the DB is built dynamically on startup by running `alembic upgrade head` (to create tables) followed by `python scripts/migrar_dados.py` (to seed the static portfolio data into SQL).
*   **Active Security**: Built-in protection includes a 5-minute deduplication window, honeypot traps, and heuristic spam scoring.
*   **Instant Availability**: We employ a GitHub Actions keep-alive CRON (`keep-alive.yml`) that pings the Koyeb Eco instance every 5 minutes to prevent it from spinning down dynamically, ensuring a responsive experience for recruiters without costs.

---

## 📊 Observability Endpoints

| Endpoint | Description |
|---|---|
| `GET /saude` | Health check (used by Koyeb probes) |
| `GET /metrics` | Prometheus metrics (request rate, latency P95/P99, error rate) |
| `X-Request-ID` header | Unique ID in every response for log correlation |
| `X-Trace-ID` header | OpenTelemetry trace ID for distributed tracing |

> **Note**: `/metrics` is publicly accessible on Koyeb at `https://<app>.koyeb.app/metrics`.
> For a portfolio this is acceptable. Add Basic Auth if you want to restrict access.

---

## 🔍 Local Monitoring Stack (Development)

To run Prometheus + Grafana + Jaeger locally:

```bash
# Uncomment the monitoring services in docker-compose.yml, then:
docker-compose up -d api prometheus grafana jaeger
```

| Service | URL | Credentials |
|---|---|---|
| Grafana Dashboards | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Jaeger UI | http://localhost:16686 | — |
| API Metrics | http://localhost:8000/metrics | — |

---
**Maintained by**: Argenis1412/portfolio
**Version**: 1.2.0 (Observability — Sentry + Prometheus + OpenTelemetry)
