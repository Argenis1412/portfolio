"""
HTTP cache helpers — ETag generation and 304 Not Modified support.

Usage within a FastAPI route:

    from fastapi import Request, Response
    from app.core.cache_http import cacheable_response

    @router.get("/about")
    async def get_about(request: Request, response: Response, ...):
        data = await uc.execute()
        return cacheable_response(request, response, data, max_age=300)

Design Notes
------------
- ETag is a SHA-256 of the JSON-serialized payload (the first 16 hex characters
  are sufficient to avoid collisions at this scale).
- ``stale-while-revalidate=60`` allows browsers/CDNs to serve old content
  for another 60s while revalidating in the background — zero-latency UX.
- When the client sends ``If-None-Match`` equal to the current ETag, we return
  a 304 without a body, saving the full payload transfer.
"""

import hashlib
import json
from typing import Any

from fastapi import Request, Response

_MAX_AGE_DEFAULT = 300  # 5 min
_SWR_DEFAULT = 60  # stale-while-revalidate


def _generate_etag(payload: Any) -> str:
    """Calculates a short ETag for any JSON-serializable payload."""
    serialised = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str)
    digest = hashlib.sha256(serialised.encode()).hexdigest()
    return f'"{digest[:16]}"'


def cacheable_response(
    request: Request,
    response: Response,
    payload: Any,
    *,
    max_age: int = _MAX_AGE_DEFAULT,
    swr: int = _SWR_DEFAULT,
) -> Any:
    """
    Attaches cache headers and handles conditional GET (If-None-Match → 304).

    Parameters
    ----------
    request:  Received FastAPI Request (required to read If-None-Match).
    response: FastAPI Response object used to set headers in case of a normal 200.
    payload:  The response body (will be serialized for ETag calculation).
    max_age:  Cache-Control max-age in seconds (default 300).
    swr:      stale-while-revalidate in seconds (default 60).

    Returns
    -------
    - A ``Response(status_code=304)`` when the client already has an updated copy.
    - The original ``payload`` (unchanged) for normal 200 responses.
      FastAPI will serialize it as usual via the route's ``response_model``.
    """
    etag = _generate_etag(payload)
    cache_control = f"public, max-age={max_age}, stale-while-revalidate={swr}"

    client_etag = request.headers.get("if-none-match")
    if client_etag and client_etag == etag:
        # Client already has an up-to-date copy — skip body transmission
        return Response(
            status_code=304,
            headers={
                "ETag": etag,
                "Cache-Control": cache_control,
            },
        )

    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = cache_control
    return payload
