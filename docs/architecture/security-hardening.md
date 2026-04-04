# 🛡️ Security Hardening & Performance Optimization

This document explains the security and performance layers implemented in the backend middleware to ensure a production-grade posture.

## 1. Security Headers Middleware

The backend includes a custom `SegurancaHeadersMiddleware` that injects essential security headers into every HTTP response. This mirrors the protections typically found in frontend hosting configurations (like `vercel.json`).

### Implemented Headers:
- **`X-Frame-Options: DENY`**: Prevents the site from being embedded in iframes, mitigating Clickjacking attacks.
- **`X-Content-Type-Options: nosniff`**: Prevents the browser from "sniffing" the MIME type, forcing it to respect the declared `Content-Type`.
- **`Strict-Transport-Security (HSTS)`**: Enforces HTTPS connections for a duration of one year, including subdomains. This prevents SSL stripping attacks.
- **`Referrer-Policy: strict-origin-when-cross-origin`**: Controls how much referrer information is sent with requests, protecting user privacy while allowing necessary cross-origin tracking.
- **`X-XSS-Protection`**: Legacy header enabled in "block" mode for additional protection in older browsers.

## 2. Low-Latency Performance (GZip)

To optimize load times and reduce bandwidth usage (especially for mobile users), the backend utilizes `GZipMiddleware`.

- **Threshold**: Only payloads larger than **1KB** are compressed to avoid the computational overhead of compressing tiny JSON responses.
- **Benefit**: Reduces the size of large project lists or experience logs by up to 70-80%, significantly improving the Time to First Byte (TTFB) and overall UX.

## 3. Distributed Rate Limiting (Redis)

Standard rate limiting often fails in distributed environments (like Koyeb or multi-instance Docker) because each instance maintains its own memory-based counters.

### The Solution:
The system is configured to use **Redis** as a centralized storage backend for `slowapi`.
- **Consistency**: If a user is blocked by Instance A, they are automatically blocked by Instance B.
- **Persistence**: Rate limit counts survive backend restarts, ensuring anti-spam policies are always enforced.
- **Fallback**: If Redis is not configured, the system gracefully falls back to local memory storage, ensuring the application remains functional in dev environments.
