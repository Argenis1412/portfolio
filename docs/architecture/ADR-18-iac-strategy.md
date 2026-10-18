# ADR-18: Infrastructure as Code Strategy

**Status:** Accepted scope, with historical database context.
**Original date:** 2026-05-04. **Version:** v1.7.0.
The root architecture index uses decision 19 for this topic; this identifier
remains stable for existing references.

## Decision and retained boundary

Terraform manages Koyeb application/service configuration and secret-backed
application settings. Third-party stateful services were deliberately outside
that provisioning scope. The original design included manually provisioned
Supabase PostgreSQL and Upstash Redis; the cleanup application now uses JSON
content, Redis, and Resend without SQL.

Existing database resources and secret identities are retained. Their presence
in Terraform does not mean a new backend needs SQL or authorize deleting them.
Resource decommissioning is a separate operation.

## Consequences and verification limits

The scope keeps compute configuration reviewable but does not reproduce every
external account, provider setting, credential, or operational dependency.
Claims that a reviewer can deploy in fewer than ten commands or understand the
entire environment in five minutes are not acceptance criteria or measured facts.
A Terraform apply is not an atomic transaction and does not prove complete
infrastructure parity or ongoing reliability.

GitHub Actions passes values to Terraform, which configures Koyeb. Preserve stable
internal identities while exposing English application keys. Review a plan for
unexpected changes; no infrastructure changes are part of this documentation
cleanup. The application no longer needs database initialization, but existing
infrastructure variables/resources remain a separate concern.

See the [operations runbook](production-operations.md) for release prerequisites,
[INC-007](INCIDENT_KOYEB_TERRAFORM.md),
[INC-008](INCIDENT_DESTRUCTIVE_IAC_MIGRATION.md), and
[INC-009](INC-009-terraform-resource-collision.md) for recorded migration failures.
Original wording remains available with
`git show bb3ff44:docs/architecture/ADR-18-iac-strategy.md`.
