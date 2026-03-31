# Portfolio Deployment Guide

Standard Operating Procedure for deploying the Full-Stack Portfolio with a focus on zero-cost, high performance, and permanent availability.

## 🚀 Backend Infrastructure (Koyeb)
Scalable Python API hosting.

1.  **Source**: Connect your GitHub repository.
2.  **Service Configuration**:
    *   **Root Directory**: `/backend`
    *   **Instance Type**: `Nano` (512MB RAM - Permanent Free Tier)
    *   **Start Command**: `uvicorn app.principal:app --host 0.0.0.0 --port 8000`
    *   **Port Visibility**: Expose port `8000` (HTTP)
3.  **Environment Variables**:
    *   `FORMSPREE_FORM_ID`: Your target Formspree ID (e.g., `xzdjqvok`)
    *   `AMBIENTE`: `production`

---

## 💻 Frontend Interface (Vercel)
Global Edge UI deployment.

1.  **Source**: Connect the same GitHub repository.
2.  **Project Configuration**:
    *   **Framework Preset**: `Vite`
    *   **Root Directory**: `/frontend`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
3.  **Environment Variables**:
    *   `VITE_API_URL`: `https://your-api.koyeb.app/api/v1` (Map from Koyeb URL).

---

## 🛠️ Architecture Notes
*   **Database (SQLite)**: The `portfolio.db` is an immutable asset in production. To update content (projects, experiences), modify the JSON/DB locally and perform a `git push`.
*   **Active Security**: Built-in protection includes a 5-minute deduplication window, honeypot traps, and heuristic spam scoring.
*   **Instant Availability**: Unlike Render's free tier, Koyeb Nano instances do not spin down, ensuring a 24/7 responsive experience for recruiters.

---
**Maintained by**: Argenis1412/portfolio
**Version**: 1.1.0 (Contact Security & UX Update)
