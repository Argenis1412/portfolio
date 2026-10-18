# Case Study: INC-004 (CSP Blocking)

**Historical period:** v1.3.x to v1.4.0, production domain cutover.
**Recorded classification:** `REAL`. The original report cited browser console
logs and Vercel telemetry; raw evidence was not revalidated for this cleanup.

## Recorded incident

After the custom-domain cutover, the browser blocked API requests because the
frontend CSP `connect-src` policy did not permit the API origin. Initial suspicion
focused on backend CORS, but the reported console violations identified the
browser policy. Local and preview behavior had not established production-policy
compatibility.

The original report described client success improving from 0% to 100% after
synchronizing frontend and backend settings. Treat those figures as historical
claims without an attached sample window here, not current availability evidence.
Backend traffic metrics alone cannot account for requests blocked by the browser
before transmission.

## Current relevance

Review frontend `connect-src` and backend origin settings together when changing
domains. They are distinct controls: a CSP fix does not prove CORS is correct,
and a successful preflight does not prove the browser permits the connection.
Update whichever policy needs changing and test the intended deployed origin;
the same regex edit is not required for every possible domain change.

The former guide claimed automated preflight assertions in CI without identifying
the job or artifact. This document makes no current coverage claim from that
statement. See the [CORS policy](../architecture/cors-policy.md) and
[security controls](../architecture/security-hardening.md).

The [changelog](../../CHANGELOG.md) preserves the incident history. Original
wording remains available with
`git show bb3ff44:docs/case_studies/INC-004_csp_blocking.md`.
