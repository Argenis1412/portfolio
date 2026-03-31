# CORS Policy Architecture

This document explains the strategy used for Cross-Origin Resource Sharing (CORS) in the portfolio backend.

## The Challenge

Vercel generates dynamic deployment URLs for every branch and preview (e.g., `portfolio-git-main-argenis1412s-projects.vercel.app`). Manually maintained allow-lists are fragile and result in frequent "Blocked by CORS policy" errors as the project grows.

## The Solution: Regex-Based Origins

Instead of a static list, we use a regular expression to validate origins.

### Configuration
In `app/configuracao.py`:
```python
regex_origens_permitidas: str | None = r"https://.*\.vercel\.app"
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
- **Regex Precision**: We use `\.vercel\.app` (with an escaped dot) to ensure we only allow subdomains of `vercel.app`, not domains like `somevercel.app`.
- **Environment Overrides**: The regex can be easily changed via the `REGEX_ORIGENS_PERMITIDAS` environment variable without code changes.

## Verification
Any domain matching `https://*.vercel.app` is automatically granted access, ensuring smooth deployments and a premium developer experience.
