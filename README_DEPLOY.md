# Portfolio Deployment Guide

Standard Operating Procedure for deploying the Full-Stack Portfolio with a focus on zero-cost, high performance, and permanent availability.

## 🚀 Backend Infrastructure (Koyeb)
Scalable Python API hosting.

1.  **Source**: Connect your GitHub repository.
2.  **Service Configuration**:
    *   **Root Directory**: `/` (Keep at root for monorepo Docker context)
    *   **Builder**: Select `Dockerfile`
    *   **Dockerfile location**: `backend/Dockerfile`
    *   **Instance Type**: `Nano` (512MB RAM - Permanent Free Tier)
    *   **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
    *   **Port Visibility**: Expose port `8000` (HTTP)
3.  **Environment Variables**:

    | Variable | Required | Description |
    |---|---|---|
    | `ENVIRONMENT` | ✅ Yes | Must be exactly `production` to enable prod guards |
    | `REDIS_URL` | ✅ Yes (prod) | Redis URL (e.g. `rediss://...`). Required for rate-limiting and idempotency |
    | `RESEND_API_KEY` | ✅ Yes | Resend API Key for email delivery |
    | `ALLOWED_ORIGINS` | ✅ Yes (prod) | Comma-separated list of allowed CORS origins. **Must include your Vercel URL** (e.g. `https://argenisbackend.com,https://my-app.vercel.app`) |
    | `METRICS_BASIC_AUTH_USERNAME` | ✅ Yes (prod) | Username for `/metrics` Basic Auth |
    | `METRICS_BASIC_AUTH_PASSWORD` | ✅ Yes (prod) | Password for `/metrics` Basic Auth |
    | `SENTRY_DSN` | ⭐ Recommended | Sentry DSN for error tracking |
    | `SENTRY_TRACES_SAMPLE_RATE` | Optional | Transaction sample rate `0.0–1.0` (default: `0.2`) |
    | `OTLP_ENDPOINT` | Optional | OTLP endpoint for distributed traces (e.g. Grafana Cloud) |

    > [!IMPORTANT]
    > `ALLOWED_ORIGINS` is critical. If the Vercel domain is not listed, the browser will block all API
    > calls with a CORS error (`Failed to fetch`). After any Vercel redeployment that changes the preview
    > URL, update this variable in Koyeb and redeploy the backend service.

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

    | Variable | Required | Value | Description |
    |---|---|---|---|
    | `VITE_API_URL` | ✅ Yes | `https://api.argenisbackend.com/api/v1` | Base URL for all API calls |

    **`VITE_API_URL` — Formal Contract**

    > [!IMPORTANT]
    > The value of `VITE_API_URL` **must end with `/api/v1`** (no trailing slash).
    >
    > - ✅ Correct: `https://api.argenisbackend.com/api/v1`
    > - ❌ Wrong: `https://api.argenisbackend.com` (missing suffix)
    > - ❌ Wrong: `https://api.argenisbackend.com/api/v1/` (trailing slash)
    >
    > **Why this matters:** All endpoint builders (e.g. `buildApiUrl('/about')`) concatenate paths
    > directly onto this base. Without `/api/v1`, requests land on non-existent routes and fail silently.
    >
    > **Enforcement:** In production builds (`import.meta.env.PROD === true`), the frontend will
    > **throw a startup error** if the suffix is missing, preventing a broken deployment from going live.
    > In development, it auto-normalizes and logs a `console.warn`.

    *   **Live Status**: `https://api.argenisbackend.com/health` (JSON Health Check)

---

## 🛠️ Architecture Notes
*   **Portfolio data**: Served from memory-cached JSON files in `backend/data/`. No SQL database, migration, or seeding step is required. `/health` checks local JSON readability and email configuration; `/live` only checks process liveness.
*   **Active Security**: Built-in protection includes a 5-minute deduplication window, honeypot traps, and heuristic spam scoring.
*   **Instant Availability (Fixing the 15s Cold Start)**: Cloud platforms like Koyeb hibernate free web services, which causes a 10-15s cold start. To prevent this, configure an **external cron service** (like [cron-job.org](https://cron-job.org/en/)) to send a `GET` request to `https://api.argenisbackend.com/live` every **3 minutes**.

    Use `/live` (not `/health`) because it has **zero external dependencies** — no file checks, no Redis — so the keep-alive ping itself never causes a failure or adds load.

    **cron-job.org setup**:
    - URL: `https://api.argenisbackend.com/live`
    - Interval: Every 3 minutes
    - Method: GET
    - Expected HTTP status: 200

    > ⚠️ *Note*: GitHub Actions `cron` was previously used but is highly unreliable (often delayed in the queue up to 15+ minutes), defeating the purpose of a keep-alive ping. Always use a dedicated uptime service.

### Koyeb Deploy Flow
Build `backend/Dockerfile` from the repository root and start the API. The image
includes `backend/data/`; there is no migration or seed release task.


---

## 📊 Observability Endpoints

| Endpoint | Description |
|---|---|---|
| `GET /live` | Liveness check (no dependencies — ideal for keep-alive) |
| `GET /health` | Health check (used by Koyeb probes) |
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

> **Directory Note**: The `infra/monitoring/` directory contains the configuration files for Prometheus and Grafana. It is actively mounted as volumes by `docker-compose.yml` and must not be deleted. Do not confuse it with `infrastructure/`, which contains the Terraform state and definitions.

| Service | URL | Credentials |
|---|---|---|
| Grafana Dashboards | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Jaeger UI | http://localhost:16686 | — |
| API Metrics | http://localhost:8000/metrics | — |

---
**Maintained by**: Argenis1412/portfolio
**Version**: 1.9.2 (API URL Contract Governance — Fail-fast enforcement, CORS diagnostics, env var table)
