# Release Readiness

## Validation

The release gate runs frontend linting, TypeScript compilation, Vitest, and Playwright. Without `BASE_URL`, Playwright starts the local frontend with the production API base URL for read requests. When `BASE_URL` is set, Playwright skips the local web server and does not inject `VITE_API_URL`; the externally hosted frontend must already use the intended API configuration. Its mutating chaos endpoints are intercepted in the browser, so release validation does not write production state.

Manual validation covers desktop and 390×844 mobile layouts, the navigation drawer, keyboard navigation, heading focus, visible focus states, screen-reader labels, contrast tokens, and reduced-motion behavior.

## Operational Evidence

`REAL` identifies verifiable production telemetry or checked-in test and CI artifacts. `REPRODUCED` identifies a controlled experiment that recreates a production-relevant behavior. `SYNTHETIC` identifies deliberate demonstration data and must never be presented as production telemetry.

## Discoverability Limits

The Vercel SPA rewrite returns one HTML document for every route. The HTTP metadata contract is therefore limited to the static root metadata in `frontend/index.html`. Route-specific HTTP metadata, social previews, HTTP 404 responses, and HTTP-level `noindex` require prerendering, SSR, or edge rendering.

The sitemap lists only stable static routes. API-driven project routes are intentionally excluded because their identities are not available when the sitemap is served. Invalid dynamic IDs retain client-side semantics; a rendering-layer implementation must distinguish resource absence from temporary API failure before introducing an HTTP indexability contract.

## Known Limitations

Real chaos validation is not part of the release suite. It requires an explicitly authorized, isolated sandbox or staging environment with defined cleanup.
