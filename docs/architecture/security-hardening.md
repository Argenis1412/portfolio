# Backend Security Controls

This describes controls in the cleanup branch, not a security certification or
verification of the deployed environment. Frontend retirement still blocks
release. Configuration and operational prerequisites are in the
[backend guide](../../backend/README.md#configuration) and
[operations runbook](production-operations.md).

## Response headers

`SecurityHeadersMiddleware` sets these headers on responses that pass through it:

| Header | Current value or condition |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` in production or when the request scheme is HTTPS. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables camera, microphone, and geolocation. |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`, except paths starting with `/docs` or `/redoc`. |

The backend does not set the former guide's `X-XSS-Protection` header. Sending
an HSTS header with `preload` does not prove enrollment in a browser preload list.
Interactive docs and the OpenAPI route are disabled in production. Frontend
hosting has its own policy; backend headers do not replace its CSP or TLS
configuration. Inspect actual responses when validating deployment.

## Access, abuse protection, and proxy trust

- `/metrics` requires Basic Auth in production. Startup validation requires Redis
  and non-empty metrics credentials, rejects wildcard origins, and rejects the
  explicitly unrestricted regex forms `.*` and `^.*$`. It does not audit every
  possible permissive regex or verify provider connectivity.
- CORS uses an explicit list plus a regex, with restricted methods/headers. It
  governs browser access, not authentication or protection against direct HTTP
  clients. See the [CORS policy](cors-policy.md).
- Redis supports shared rate limits, deduplication, and optional idempotency.
  Contact rate limits degrade to process-local memory on storage failure;
  read-only checks fail open. Local fallback is neither shared nor durable, and
  failure of the contact memory limiter also allows through. See the
  [failure model](FAILURE_MODEL.md) for limits and delivery behavior.
- With `TRUSTED_PROXY_IPS`, forwarded client identity is accepted only from a
  listed peer. With an empty list, the default depth-based compatibility mode
  trusts forwarded headers according to `TRUSTED_PROXY_DEPTH`; it is not strict
  anti-spoof protection. Verify the actual proxy chain before relying on IP limits.

Contact validation rejects invalid/blank required input; HTML email fields are
escaped. Spam scores flag delivered messages, while honeypots silently drop
submissions. These controls do not guarantee spam elimination. Logging masks
selected fields rather than all arbitrary data; see the
[logging limits](LOGGING_AND_DEGRADATION.md#data-handling-limits).

## Compression and evidence

`GZipMiddleware` uses `minimum_size=1000` bytes, subject to client negotiation and
middleware behavior. Compression affects transferred size, not a guaranteed
70-80% reduction or faster time to first byte. Caching is documented separately
in the [HTTP cache decision](HTTP_CACHING.md).

The previous guide used a retired middleware name and overstated unconditional
headers, Redis guarantees, and measured compression gains. Original wording is
available with `git show 989c04c:docs/architecture/security-hardening.md`.
