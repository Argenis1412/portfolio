# Backend CORS Policy

`_configure_cors()` in `app/main.py` uses `CORSMiddleware` with both the explicit
`ALLOWED_ORIGINS` list and `REGEX_ALLOWED_ORIGINS` from `app/settings.py`.
The list is comma-separated; either mechanism can admit an origin. Setting a
narrow list alone does not narrow the regex.

## Current configuration

| Setting | Current behavior |
|---|---|
| Credentials | `allow_credentials=True`. |
| Methods | `GET`, `POST`, `OPTIONS`. |
| Request headers | Explicitly allows `Content-Type`, `Idempotency-Key`, `Authorization`, and temporary `X-Chaos-Preset`, in addition to middleware handling of CORS-safelisted headers. |
| Exposed response headers | `X-Trace-ID`, `X-Request-ID`, `X-Response-Time`. |
| Origin regex default | Anchored alternatives for HTTPS `argenisbackend.com` with at most one subdomain, the configured portfolio preview-name pattern under `argenis1412s-projects.vercel.app`, and HTTP localhost/127.0.0.1 ports. |

Use the exact regex in `app/settings.py` when reviewing matches; do not copy the
older ungrouped expression from this document's history. The shared
[environment example](../../.env.example) shows the English setting names.
These defaults are application configuration, not evidence of current production
values or ownership of every matching hostname. Localhost patterns are not
automatically removed in production; choose production overrides deliberately.

`X-Chaos-Preset` is ignored by the backend and temporarily allowed for the current
frontend. Remove this allowance only with its remaining client consumer.
`X-Debug-Mode` is not allowed or used. See the
[deployment dependency](../../CHANGELOG.md#frontend-deployment-dependency).

## Browser and cache boundaries

CORS does not authenticate callers or prevent direct HTTP requests. Allowing an
origin also does not grant metrics access: `/metrics` separately requires Basic
Auth in production. The old public-metrics policy is superseded.

The explicit configuration neither exposes `ETag` nor permits `If-None-Match`.
Consequently, this guide does not promise that cross-origin JavaScript can read
ETags and perform manual conditional requests. Browser-managed HTTP caching is
separate; see the [cache decision](HTTP_CACHING.md). Any header-policy change
requires a scoped implementation and verification.

When changing a domain, review frontend `connect-src` and backend origin settings
together. Verify allowed and disallowed preflights, actual response headers, and
credential behavior for the intended environment. Backend CSP does not authorize
the frontend's outgoing requests. See the [security controls](security-hardening.md)
and historical INC-004 in the [changelog](../../CHANGELOG.md).

Original wording is available with
`git show 989c04c:docs/architecture/cors-policy.md`. No deployed CORS settings or
external monitors were changed or verified by this documentation update.
