# Frontend phase 1 evidence

Historical measurement date: 2026-10-29. Source base: `8f3a13a`;
measured final source: `3773fd0`. Later route-prefetch corrections do not change
the measured home behavior, but these figures have not been remeasured against
the subsequent commit.

## Measurements and limits

Three sequential fresh Lighthouse 13.6.0 / Chromium 148 runs per series;
mobile 412×823, DPR 1.75, CPU slowdown 4, DevTools throttling, RTT 150 ms,
throughput 1638.4 Kbps. Sentry ingestion and contact requests were blocked.

| Median | Production baseline | Local base | Local final |
|---|---:|---:|---:|
| Performance | 54 | 60 | 90 |
| Accessibility | 100 | 100 | 100 |
| FCP (ms) | 3025.897 | 2418.388 | 2360.537 |
| LCP (ms) | 5504.911 | 4774.701 | 3158.745 |
| CLS | 0.426489 | 0.426489 | 0.064978 |
| TBT (ms) | 36.776 | 0 | 0 |

Local base/final builds used identical settings and a temporary Vite preview
proxy to the real public API, since the API does not allow localhost through
CORS. Every valid local run received HTTP 200 for projects/about/stack. The
proxy was not committed to application configuration. Production baseline is a
separate control; there is no production after-deployment comparison here.

The final LCP is the first project's description in all three runs; the base
LCP is the About paragraph. Local CLS and Accessibility meet the phase targets;
mobile LCP remains above 2500 ms. Remaining CLS is associated with unchanged
Inter font reflow. Initial CORS-rejected/error-state runs were excluded from
the normal-content series: their median CLS regressed from 0.156744 to 0.201701.
Error and empty states release loading reservations and have no CLS guarantee.

## Retained artifacts

- [summary.json](summary.json): per-run metrics, observed LCP/CLS elements and
  request timings for the valid series; `before` means production baseline.
- [raw/](raw/): the nine original Lighthouse JSON reports, gzip-compressed.
  Decompress with `gzip -dc raw/local-after-1.json.gz` to inspect a full report.
- [comparison.json](comparison.json): all 12 full-page base/final comparisons,
  375/1280 px × light/dark × EN/PT/ES, with loaded fonts and identical fixtures.
  Every difference bounding box is null and dimensions match. The original PNGs
  remain local; this JSON preserves comparison results, not the images.
- [before-chunks.json](before-chunks.json), [after-chunks.json](after-chunks.json)
  and [after-graph.json](after-graph.json): build size/import evidence.
- [delayed.json](delayed.json): delayed API geometry checks.
- [console-results.json](console-results.json): browser error checks.
- [qa/](qa/): original per-commit lint/typecheck/test output, final build/E2E
  output, and review-follow-up checks. Empty typecheck files mean the command
  succeeded without output; each original QA script used `set -euo pipefail`.
- [hosted-checks.json](hosted-checks.json) and
  [served-profile.json](served-profile.json): hosted verification described below.

The original eight commits passed required checks before each commit, with
66/67/68/68/68/68/71/71 tests respectively. Original final Playwright: 60 passed.
The first follow-up routes run passed all six new request-count cases but failed
two existing cases while QA ran concurrently; its output is retained as
`qa/review-routes.txt`, rather than represented as a successful run.
The subsequent complete run without concurrent QA passed all 66 Playwright
tests; see `qa/review-e2e.txt`. The follow-up required checks passed with 71
unit/integration tests, and the public-API production build passed.

## Hosted checks

The existing Vercel preview for `3773fd0` was read on 2026-10-29 without a bypass:

- `/assets/index-C9h10q_C.js`: HTTP 200,
  `Cache-Control: public, max-age=31536000, immutable`.
- `/index.html` and `/`: HTTP 200,
  `Cache-Control: public, max-age=0, must-revalidate`.
- Production `https://argenisbackend.com/profile.jpg`: downloaded JPEG measured
  600×800; the downloaded byte hash is retained with the response fields.
- API GET `/api/v1/projects` with this preview's Origin: HTTP 200 but no
  `Access-Control-Allow-Origin`. Browser access from this preview is therefore
  CORS-blocked. Preview Lighthouse would measure an API error state, so it is not
  offered as normal-content validation. No bypass or backend CORS change was made.

Preview cache verification does not establish production asset headers. No
production deploy, contact submission, or intentional Sentry event was performed.

## Review follow-up scope

`ProjectCasePage` consumes `useProjects`; decisions and 404 do not. Startup
prefetch is now restricted to home, matching project-case routes and the retired
evidence route that redirects to a project case. Six new browser cases assert
one projects request for consumers and zero for decisions, 404 and an unmatched
nested project URL.

Remaining follow-ups outside the fixed phase: strengthen the theme-change
assertion, hide the empty decorative Experience skeleton subtree explicitly,
check loading announcements with assistive technology, distinguish future demo
link names, reduce font/error-state CLS, improve mobile LCP and create a dedicated
social image. The PR remains draft; no approval or production readiness is inferred.
