# Architecture Decision Record: HTTP Caching

## Current backend decision

Portfolio content routes use `cacheable_response()` in `app/core/cache_http.py`.
This covers about, project lists/details, stack, experiences, formation, and
philosophy under the API routers. It is separate from the repository's
[on-demand JSON cache](JSON_FIRST_READ_PATH.md).

| Response | Backend behavior |
|---|---|
| Content with no matching validator | Returns the payload with `ETag` and `Cache-Control: public, max-age=300, stale-while-revalidate=60`. |
| Exact matching `If-None-Match` string | Returns HTTP 304 with no body, retaining `ETag` and `Cache-Control`. |
| `/api/v1/metrics/summary` | Sets `Cache-Control: public, max-age=15`; it does not use the ETag helper. |

The ETag is a quoted value containing the first 16 hexadecimal characters of a
SHA-256 digest. Input is `json.dumps(payload, ensure_ascii=False, sort_keys=True,
default=str)`, not necessarily the exact wire bytes after response-model
serialization and compression. The helper compares the whole incoming header
string for equality; it does not parse validator lists, weak tags, or `*`.

## Work saved and freshness limits

Routes execute their use cases and construct payloads before calling the helper.
The helper serializes input to calculate the ETag even for a 304. A matching tag
saves body transfer and subsequent normal response-body rendering; it does not
skip route execution, rate-limit checks where present, or all serialization.
A 304 still transfers response headers.

Cache directives permit reuse but do not prove that a browser or intermediary
stored the response, honored stale-while-revalidate, or revalidated it. Repository
values remain cached for the repository instance; HTTP expiry does not reload
changed files. Deploy corrected content and restart the process to replace
cached values. Existing copies may remain fresh for the advertised cache period.

Do not generalize these public cache directives to contact responses or assume
that every endpoint uses the helper. Error responses are not successful cached
content; failed stack reads propagate errors without a successful ETag response.

## Frontend and historical context

The former guide claimed automatic TanStack Query revalidation, a universal
15-minute client stale time, and current Chaos metrics caching. Those claims are
not this backend's contract. Frontend request/cache behavior requires a separate
review during frontend retirement. In particular, CORS currently does not expose
`ETag` or explicitly allow `If-None-Match` for manual JavaScript revalidation; see
the [CORS policy](cors-policy.md#browser-and-cache-boundaries).

Original wording is available with
`git show 989c04c:docs/architecture/HTTP_CACHING.md`.
No cache performance measurements or deployed CDN behavior were verified here.
