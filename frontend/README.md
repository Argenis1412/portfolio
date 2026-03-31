# 🎨 Portfolio Frontend

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TanStack Query](https://img.shields.io/badge/-TanStack%20Query-FF4154?style=for-the-badge&logo=react-query&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss_v4-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

Frontend application for a professional portfolio. Engineered as a **strict consumer** of a versioned REST API, featuring declarative data management, predictive prefetching, and a highly maintainable i18n system.

## ✨ Key Features

- **💎 TanStack Query (v5)**: 
    - **Predictive Prefetching**: Data is pre-loaded on Link hover/focus.
    - **Background Sync**: Silent revalidation on window focus.
    - **Centralized Mutations**: Robust state management for the contact form.
- **🌍 Scalable i18n**: Externalized JSON manifests in `src/i18n/` for true decoupling of content and code.
- **🎨 Tailwind CSS v4**: Modern styling with native CSS variables and glassmorphism.
- **🛡️ Automated QA**: Husky + lint-staged force 100% lint/test pass before every commit.

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

## 🧪 Testing & Quality

We use **Vitest** + **@testing-library/react** for unit and component testing.
The project enforces a **Quality Gate**:
1. **Local**: Husky runs tests/lint on staged files.
2. **Remote**: GitHub Actions runs the full suite on every push.
