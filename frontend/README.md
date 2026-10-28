# 🎨 Portfolio Frontend

> **Live Demo:** [argenisbackend.com →](https://argenisbackend.com)

Frontend application built with **React 19** and **Vite**. Engineered as a **strict consumer** of a versioned REST API, featuring declarative data management with TanStack Query and a premium "Graphite & Bronze" aesthetic.

## ✨ Key Features

- **💎 TanStack Query (v5)**:
    - **Predictive Prefetching**: Data is pre-loaded on Link hover/focus.
    - **Background Sync**: Silent revalidation on window focus.
    - **Centralized Mutations**: Robust state management for the contact form.
- **🌍 Scalable i18n**: Externalized JSON manifests in `src/i18n/` for true decoupling of content and code.
- **🎨 Tailwind CSS v4**: Modern styling with native CSS variables and glassmorphism.
- **🛡️ Automated QA**: Husky + lint-staged force 100% lint/test pass before every commit.

## 🏗️ Component Architecture

### Home page

The home page follows Hero → Projects → About → Contact in one centered container.
`FeaturedProjects` displays every API project, including repository/demo links and
available case studies, with explicit loading, retry and empty states. Its editorial
order is the deployed portfolio, Housing Finance GPS, Loja App, then PatchForge;
the API retains its featured/alphabetical ordering. Housing Finance GPS links to
its repository and describes implemented domain/API work without claiming a public demo.
Projects use open rows. Home-only Graphite & Bronze tokens, typography and spacing
are scoped to `.home-page` and its mobile drawer, leaving detail routes intact.
Skills and the
existing experience timeline remain available under native disclosure controls.
The portfolio case study retains its engineering decision links and two documented
cases: the historical Terraform secret identity collision and the local load test
that failed latency acceptance. Each case links to its source report and states its
limits. `/production-evidence` redirects to `/projects/portfolio-api`; the standalone
metrics, browser events and incident presentation is retired. Home and case study
routes do not poll metrics. Existing telemetry hooks and lower-level components
remain unchanged; removing that unused code is outside this content change.
Loja App remains a project and case study, but is excluded from the professional
experience catalog. Employment and education remain available under About.
The contact form uses the unchanged `useContactForm` hook, with response details
collapsed and submission feedback announced to assistive technology. Theme,
EN/PT/ES, keyboard navigation and reduced-motion support are preserved.
Email/phone copy controls live with contact on home; other routes keep them in the footer.

Run `npm run e2e -- --retries=0 --workers=1` for isolated fixtures, desktop/mobile
home checks at 1440, 1024 and 390 pixels, contact and evidence regressions. Reports and screenshots go to the
system temporary directory by default; no real contact messages are sent.

The UI is built using atomic, highly specialized components to ensure modularity:

- **`MobileNav`**: Responsive drawer menu featuring scroll-lock, isolated focus trapping, and graceful mounting animations.
- **`Hero`**: Static introduction with project and GitHub actions.
- **`Footer`**: Compact source/social links and email/phone copy controls.
- **`Contact`**: Uses `useContactForm` for validation, idempotent submission, errors and loading feedback.

## 🧠 Data Fetching Pattern (`useApi.ts`)

All API interactions are localized in `src/hooks/useApi.ts`. We **do not** write `fetch` or `axios` calls directly in components.

- **Queries**: Modular hooks (`useAbout`, `useProjects`, `useSkills`, etc.) encapsulate the fetcher logic, utilizing TanStack Query to cache JSON payloads. Stale times are specifically tuned (e.g., 5 mins for projects, 10 mins for skills, 60 mins for philosophy). Components simply consume `data`, `isLoading`, or `isError`.
- **Mutations**: `useContactMutation()` handles the POST request, orchestrating success toasts and error boundaries without leaking implementation details into `ContactForm`.

## ♿ Accessibility (a11y)

The frontend is built to be resilient for all users, regardless of navigation method:

- **Visible Focus Rings**: All interactive elements (buttons, links, inputs) have explicit `focus-visible` styling tailored to the dark theme.
- **Keyboard Navigation**: Full support for Tab navigation. `MobileNav` utilizes Focus Trap to prevent keyboard users from tabbing into hidden content.
- **Esc Key Support**: Modals and mobile drawers can be dismissed natively using the `Escape` key.
- **Semantic HTML**: Proper use of `<nav>`, `<main>`, `<section>`, and `aria-label` attributes across the application.
## 📂 Source Structure

```
src/
├── api.ts              # API Client & Shared Interfaces
├── hooks/
│   └── useApi.ts       # Centralized query & mutation hooks
├── i18n/
│   ├── en.json         # English translations
│   ├── pt.json         # Portuguese translations
│   └── es.json         # Spanish translations
├── context/
│   ├── LanguageContext.tsx   # Language state + i18n logic
│   └── ThemeContext.tsx      # Dark/light theme state
├── components/         # Atomic UI components
└── App.tsx             # Main layout orchestrator
```

## 🚀 Getting Started

```bash
cd frontend
npm install
npm run dev
```

### 🛠️ Maintenance Scripts

| Script | Description |
|---|---|
| `npm run build` | Production-ready build with type-checking |
| `npm run lint` | ESLint static analysis |
| `npm run test` | Unit tests with Vitest (watch mode) |
| `npm run preview` | Preview production build locally |

## 🧪 Testing & Quality Gate Policy

We use **Vitest** + **@testing-library/react** for unit and component testing.

The project strictly enforces a **Quality Gate Policy**:
1. **Husky pre-commit**: Runs ESLint and Vitest. Commits are blocked if any test fails or if coverage targets are not met.
2. **TypeScript Integrity**: `tsc --noEmit` validates type correctness in both the `Makefile` and the GitHub Actions CI pipeline.
3. **CI/CD Pipeline**: GitHub Actions runs the full lint and test suite on every push. No code reaches `main` without passing these automated gates.
