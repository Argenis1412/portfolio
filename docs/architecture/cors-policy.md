# CORS Policy Architecture

This document explains the strategy used for Cross-Origin Resource Sharing (CORS) in the portfolio backend.

## The Challenge

Vercel generates dynamic deployment URLs for every branch and preview (e.g., `portfolio-git-main-argenis1412s-projects.vercel.app`). Manually maintained allow-lists are fragile and result in frequent "Blocked by CORS policy" errors as the project grows.

## The Solution: Regex-Based Origins

Instead of a static list, we use a regular expression to validate origins.

### Configuration
In `app/configuracao.py`:
```python
regex_origens_permitidas: str | None = r"^https://argenisbackend\.com|https://portfolio.*-argenis1412s-projects\.vercel\.app$"
```

### Implementation
We use FastAPI's `CORSMiddleware` with the `allow_origin_regex` parameter:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=configuracoes.regex_origens_permitidas,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Security Considerations

- **Why not `*`?**: Using `*` prevents sending credentials (cookies/auth headers). By using a regex, we can set `allow_credentials=True`.
- **Regex Precision**: We use `r"^https://argenisbackend\.com|https://portfolio.*-argenis1412s-projects\.vercel\.app$"` to ensure we only allow our own Vercel subdomains and our main domain. Using `.*\.vercel\.app` without a prefix would allow anyone to create an `evil-site.vercel.app` and call the API with credentials.
- **Environment Overrides**: The regex can be easily changed via the `REGEX_ORIGENS_PERMITIDAS` environment variable without code changes.

## Metrics & Observability Privacy
The `/metrics` endpoint is publicly accessible. This exposes request rates, latencies, and error rates. Given the nature of a personal portfolio site:
- **Decision**: Left public intentionally to demonstrate observability instrumentation (Prometheus/Grafana) to reviewers and recruiters without managing credentials.
- **Risk Acceptance**: No PII or sensitive business data is leaked via metrics. If this were a real application with competitors or sensitive load patterns, `/metrics` would be secured behind basic authentication or an internal network.

## Verification
Any domain matching `^https://argenisbackend\.com|https://portfolio.*-argenis1412s-projects\.vercel\.app$` is automatically granted access, ensuring smooth deployments and a premium developer experience.
