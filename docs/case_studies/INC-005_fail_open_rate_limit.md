# Case Study: Rate-Limit Degradation and Proxy Trust Audit

**Historical identifier:** `INC-005` in this standalone case-study filename.
**Recorded classification:** `REPRODUCED`, security/resilience audit of v1.x.
This identifier conflicts with the changelog's INC-005 (Docker build context).
The filename is retained for existing links; this is not a newly numbered
production incident. Redis counter persistence is covered separately by INC-001.

## Recorded finding and earlier mitigation

The audit described Redis errors allowing contact requests through and forwarded
IP headers being trusted without a peer allowlist. It reported a controlled
storage-failure experiment using mocked limiter errors, not an observed
production attack or a measured 100% exposure rate.

The earlier mitigation used HTTP 503 for contact when Redis failed, while reads
remained fail-open. That historical fail-closed behavior has been superseded.
Original wording remains available with
`git show bb3ff44:docs/case_studies/INC-005_fail_open_rate_limit.md`.

## Current behavior and evidence

| Boundary | Cleanup branch behavior |
|---|---|
| Contact rate-limit storage failure | Attempt a local memory limiter; exhausted limits still reject. A failure of the memory limiter also allows through as a last resort. |
| Read-only rate-limit storage failure | Fail open. |
| Strict proxy trust | Enabled by a non-empty `TRUSTED_PROXY_IPS`; unlisted peers cannot supply forwarded identity. |
| Default compatibility mode | Uses `TRUSTED_PROXY_DEPTH` without a peer allowlist. Actual proxy configuration still matters. |

`backend/tests/test_robustness.py` checks contact memory fallback, read fail-open,
and degradation metrics; `test_rate_limit.py` covers depth-based proxy identity.
Those tests explicitly disable strict mode and do not establish strict peer
allowlist coverage. Production proxy trust and live Redis availability remain
separate verification tasks. The legacy test/constant names containing
`fail_closed` do not establish that Redis failure currently returns HTTP 503.

`rate_limit_backend_unavailable_total` and structured events expose degradation;
their presence does not prove alert routing. See the
[failure model](../architecture/FAILURE_MODEL.md) and
[security controls](../architecture/security-hardening.md).
