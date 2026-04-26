# Architecture Decision Record: HTTP Caching

## Context and Problem Statement
The frontend makes frequent requests to the backend for portfolio data, live metrics, and health status. Re-fetching identical data on every page navigation consumes unnecessary bandwidth and increases load on the server. We needed a strategy to efficiently cache API responses while ensuring the frontend always displays up-to-date data when relevant.

## Decision
We adopted a multi-layered **HTTP Caching Strategy**:
1. **React 19 + TanStack Query:** Client-side caching is optimized with a 15-minute stale time. Data is cached locally in the browser memory, enabling zero-refetch on mount and immediate transitions between pages.
2. **HTTP ETags:** The backend generates an ETag hash for responses. When TanStack Query eventually revalidates data, the request includes the `If-None-Match` header. If the data hasn't changed, the server responds with `304 Not Modified`.

## Consequences

### Positive
- **Zero-Bandwidth Revalidation:** The `304 Not Modified` responses drastically reduce payload sizes and bandwidth consumption.
- **Instant Client Navigation:** TanStack Query serves from cache immediately, making navigation feel instantaneous.
- **Reduced Server Load:** The backend skips JSON serialization and full response generation when the ETag matches.

### Negative
- **Implementation Complexity:** Requires careful handling of ETags and `Cache-Control` headers on the backend.
- **Stale Data Risks:** If caching headers are misconfigured, users might see outdated system states.

## Implementation Notes
- Cache duration for `/api/v1/metrics` is fine-tuned to avoid obscuring real-time chaos simulation changes.
- ETags are generated using a fast hashing algorithm over the response JSON bytes.
