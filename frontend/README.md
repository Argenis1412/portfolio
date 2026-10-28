# Portfolio Frontend

React 19 + TypeScript + Vite SPA using React Router, TanStack Query, Zod,
Tailwind CSS 4, Framer Motion, and Lucide icons. Dependencies and scripts are in
[package.json](package.json).

## Pages and content

- `/`: Hero → FeaturedProjects → About → Contact, with shared Navbar and Footer.
  All API projects appear as open rows, ordered Portfolio, Housing Finance GPS,
  Loja App, PatchForge, then other records. Loading, retry, and empty states are explicit.
- `/projects/:projectId`: project case study from the projects query. The portfolio
  case includes decision links, implemented trade-offs with explicit limits, and
  source-linked Terraform/load reports. Its introduction uses the same localized
  API description as the home project row.
- `/decisions/:decisionId`: localized editorial decisions for
  `deterministic-validation`, `json-first`, and `redis-streams-monolith`.
- `/production-evidence`: redirects to `/projects/portfolio-api` with history replacement.
  Unmatched paths render the SPA's not-found page.

Editorial home/decision copy lives in [EN/PT/ES translations](src/i18n/).
API JSON supplies projects, skills, experience, education, and contact details.
Personal projects belong in Projects; employment and education appear under About.
Skills, experience, and contact response details use native `details`/`summary`.
Email/phone copy controls appear in home Contact and in the footer on other routes.

Every operational claim needs its source and environment. Existing case evidence
uses `REAL` for implementation/recorded evidence, `REPRODUCED` for controlled
experiments, and `SYNTHETIC` for simulated data. State whether evidence is a test,
historical observation, or production measurement; a repository artifact alone
cannot establish live performance. The portfolio reports retain those limits.
Evidence bodies use the API's optional `localized_value` in EN/PT/ES, with the
existing English `value` as a fallback for older responses. Classification codes
remain unchanged in the API and have localized display labels.

[Vercel rewrites](vercel.json) serve the HTML shell for deep links. Root metadata
is shared: route-specific social previews and HTTP-level 404/noindex behavior
are not implemented by the client router.

## Visual system

[Tailwind's Vite plugin](vite.config.ts) compiles the `@import "tailwindcss"` and
CSS-first `@theme` definitions in [index.css](src/index.css). Utility classes map
`app-*`, signal, and status colors to CSS variables. [index.html](index.html)
provides critical base theme tokens and an early theme script.

| Surface | Implemented styling |
|---|---|
| Home and mobile drawer | `.home-page` / `.home-drawer` scope Graphite & Bronze tokens: light background `#F7F8F8`, dark background `#17191B`, bronze accents `#815526` / `#D4A373`. The experience timeline shares neutral surfaces and uses semantic colors for labels. |
| Home layout | Centered container up to 75rem, responsive gutters, border-separated project rows, restrained buttons/links, and native disclosures. Rows become two columns at 768px; typography also scales at 1200px. |
| Detail routes | Base warm light/dark theme, bordered case/evidence panels, and shared navigation/footer. |
| Typography | Google Fonts loads Inter, Montserrat, and JetBrains Mono. Body and home headings use Inter; base detail headings use Montserrat; metadata/code-style labels use JetBrains Mono. System fallbacks remain available. |
| Icons and imagery | Lucide React icons; About uses the checked-in WebP portrait with JPEG fallback, cropped to a circle at 144px on mobile and 176px from 640px. |

[ThemeContext](src/context/ThemeContext.tsx) saves `portfolio_theme`, applies the
root `light`/`dark` class, and initially prefers a saved value, then the system
light preference, then dark. The early HTML script reduces theme flashing.
[LanguageContext](src/context/LanguageContext.tsx) defaults to English, persists
`portfolio_lang`, and updates the document language. The native language selector
shows a language icon and full native names: Português, English, and Español.

`App` wraps the UI in `LazyMotion` with `domAnimation` and
`MotionConfig reducedMotion="user"`. Navbar uses `m.*`, `AnimatePresence`, and
`useReducedMotion()` for drawer/backdrop entry and exit. Experience renders visible
content without waiting for viewport observations or reveal animations. CSS
handles color, hover, and loading transitions. The reduced-motion media rule
shortens CSS transitions/animations. Global focus rings,
form labels/live feedback, and route-heading focus support keyboard navigation.
The mobile drawer is portaled, locks scrolling, makes the app root inert, traps
focus, supports Escape/backdrop dismissal, and restores focus after exit.
These mechanisms are not a complete accessibility certification.

## Data and state

[API modules](src/api/) own HTTP calls: `client.ts` builds URLs, extracts trace IDs,
and validates GET responses with Zod; portfolio/contact services expose operations.
[useApi.ts](src/hooks/useApi.ts) exposes queries and the contact mutation.
[useContactForm](src/hooks/useContactForm.ts) owns validation, submission state,
idempotency keys, and response/error presentation. The mutation itself does not
create toasts or error boundaries. Components consume these hooks; Navbar also
uses services for its existing query prefetch.

The query client retains inactive data for 30 minutes, disables default focus/mount
refetches, and retries queries once after one second. Hook stale times are five
minutes for About/projects, ten for skills/experience/education, and one hour for
philosophy. Desktop navigation currently prefetches About/skills on mouse hover
with a 20-minute stale time; this is not a general link/focus prefetch feature.

Theme and language have separate contexts. The retired metrics/log UI, polling
hooks, browser log context, and project carousel have been removed. Backend
telemetry endpoints remain operational interfaces; public pages do not poll them.
Experience uses an independent localized load error with a page reload action.
Active styling comes from `index.css` and HTML.

Project case studies use the structured `case_study` response. The public API
retains `full_description` for compatibility; the current UI does not render it.

## Development and checks

From the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Development defaults to `http://127.0.0.1:8000/api/v1`. To override it, copy
[.env.example](.env.example) to `.env.local` and set `VITE_API_URL` to an API base
ending in `/api/v1`, without a trailing slash. This is the supported deployment
value and the CI preflight checks it. The client preserves versioned `/api/vN`
suffixes, normalizes missing suffixes in development, and rejects normalization
in production. A missing production URL fails when a request is built.
`VITE_SENTRY_DSN` optionally enables frontend error reporting.

```bash
npm run lint
npx tsc -b
npm run test -- --run
VITE_API_URL=https://api.argenisbackend.com/api/v1 npm run build
npm run e2e -- --retries=0 --workers=1
```

Vitest uses jsdom and Testing Library. Playwright starts an isolated local SPA,
intercepts content/contact API requests, blocks external traffic, and runs Chromium.
`BASE_URL` selects a hosted UI under the same interception policy. Contact is
faked; metrics requests are unexpected and fail the check. These checks do not
verify production API access or send real email.
Reports/results use system temporary directories locally; CI retains its HTML report.

The Husky hook runs lint-staged for staged TypeScript files: ESLint with fixes and
Vitest. It does not enforce the complete manual checks above or frontend coverage.
GitHub workflows have branch/path filters; their definitions do not prove a given
commit passed. See [AGENTS.md](../AGENTS.md) for contribution rules.
