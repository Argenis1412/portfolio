# Resilience and Failure Handling

This document outlines the strategies and mechanisms implemented to ensure the portfolio remains robust and provides a good user experience even when facing infrastructure limitations or transient failures.

## 1. Infrastructure Context
The portfolio is hosted on free-tier services which introduce specific challenges:
- **Neon (Database)**: Sleeps after a period of inactivity. The first request triggers a "wake-up" process that can take 3-10 seconds.
- **Koyeb (Backend)**: Similar to the database, instances may spin down or experience "cold starts" on the free tier.

## 2. Failure Modes and Mitigation

### A. Database/API Cold Starts
**Problem**: The user hits a section (e.g., Projects) and the request hangs while the infrastructure wakes up.
**Mitigation**:
- **Proactive UX (ServerWakeupNotice)**: A global listener monitors active fetches. If any request takes longer than **2.5 seconds**, a "Waking up server..." toast appears to inform the user.
- **Backend Keep-Alive**: (Optional/Planned) Periodic pings to keep the database warm during peak hours.

### B. API Timeouts and Network Errors
**Problem**: Transient network issues or high latency cause requests to fail.
**Mitigation**:
- **React Query Retries**: Configured to retry failed fetches automatically (default: 3 times with exponential backoff).
- **Graceful Error States**: Each section (`Skills`, `Experience`, `Projects`) implements a dedicated error view (`ServerWakeupError`) allowing the user to retry manually without losing page context.

### C. Data Validation (Contract Safety)
**Problem**: Unexpected API responses or schema changes could crash the frontend.
**Mitigation**:
- **Zod Schema Validation**: All API responses are validated at the edge (in `api.ts`) using Zod. If the contract is violated, a controlled error is thrown, preventing the "White Screen of Death" and triggering the section's error boundary.

## 3. UI/UX Resilience Patterns

### The "Retry" Loop
When a critical fetch fails, the UI displays a clear message (`server.wakeup.error`) and a retry button.
1. **Manual Retry**: Encourages the user to refresh or click "Retry".
2. **Deterministic Fallbacks**: If the API is completely down, sections show a skeleton or a friendly "Service temporarily unavailable" message instead of breaking the layout.

## 4. Monitoring and Observability
- **Sentry**: Tracks frontend exceptions and API failures in real-time.
- **Prometheus/Grafana**: Monitors backend health, latency buckets, and error rates to identify if "cold starts" are becoming a significant UX hurdle.

---
*Last updated: April 2026*
