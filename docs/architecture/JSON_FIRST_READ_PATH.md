# JSON Reads and HTTP Caching

## Repository cache

[JsonRepository](../../backend/app/adapters/repository.py) reads checked-in files
from `backend/data/` on demand through a thread. Successful parsed values are
cached in the shared repository instance; project lookup also caches an ID index.
The optional case-study sidecar enriches project content when present.

Content is not preloaded at startup. Deploy corrected files and restart the
process to replace cached values; there is no runtime CRUD or invalidation API.
SQL is absent from application paths. Redis-backed request limiting is separate
and read-only checks fail open on storage errors.

Missing/unreadable/malformed files can fail uncached reads. Some mappings normalize
unexpected shapes; `/health` independently reads files and checks expected
top-level types, not every field. It returns HTTP 200 even when degraded.
Cached reads can therefore succeed while health reports a file problem.

## HTTP cache

[cacheable_response](../../backend/app/core/cache_http.py) covers the content
collection/detail routes, including formation and philosophy.

| Response | Cache behavior |
|---|---|
| Content without an exact matching validator | Payload, quoted ETag, `Cache-Control: public, max-age=300, stale-while-revalidate=60`. |
| Exact matching `If-None-Match` string | HTTP 304 without a body, retaining ETag and Cache-Control. |
| Metrics summary | `Cache-Control: public, max-age=15`, without the content ETag helper. |

The ETag is the first 16 hexadecimal characters of SHA-256 over sorted JSON
serialized with `ensure_ascii=False` and `default=str`. It does not necessarily
hash the final wire bytes. Matching compares the whole header string; lists,
weak tags, and `*` are not parsed. Routes still execute use cases and serialize
for hashing before deciding 304; this saves body transfer, not all request work.

HTTP expiry does not invalidate repository memory. Cache directives describe
permitted reuse, not measured CDN/browser behavior. Contact responses are outside
this helper.

## Browser and measurement boundaries

The frontend uses TanStack Query caching independently of HTTP caching; see
[its query policy](../../frontend/README.md#data-and-state). The backend does not
expose ETag or explicitly allow `If-None-Match` for manual cross-origin JavaScript
revalidation. Browser-managed HTTP caching is separate; see
[backend CORS](../../backend/README.md#browser-access-and-security).

Historical INC-002 reports motivated removing database reads. Original production
latency evidence is unavailable here; JSON does not imply a sub-50 ms guarantee.
Current checks and [benchmark targets](SLO_DEFINITIONS.md) require measurements
with source commit, resource budget, request population, and sample counts.
