# Incident Post-Mortem: INC-007

## Koyeb Terraform Provider Schema Incompatibility

**Recorded date:** 2026-05-07. **Severity:** P1, provisioning blocked.
**Historical resolution:** Secret-first orchestration, v1.8.1.
This is a historical report, not verification of today's provider capabilities.

## Recorded failure and response

During the IaC migration, provider v0.1.11 could not represent metadata required
by the Koyeb API for literal environment entries. Apply failed with HTTP 400 and
`env type is required`, blocking the release's provisioning path.

The recorded workaround moved settings into Koyeb secrets and injected secret
references into the service. Filtering omitted empty/null optional values, and
resource keys were separated from sensitive inputs to make `for_each` usable.
These describe the recorded response, not evidence that all later applies passed.

## Lessons and current boundary

Provider/API schema mismatches need version-specific evidence. Do not assume a
historical limitation still exists or upgrade providers without a scoped review.
Using secret resources does not by itself guarantee secure Terraform state;
key sensitivity annotations and secret storage are distinct concerns.

The cleanup retains secret-first wiring and stable identities. `AMBIENTE` maps
to application key `ENVIRONMENT`; confirmation of its production value remains
pending. The application no longer uses SQL even though retained infrastructure
still includes database configuration. No secret values or live state were
inspected or changed here.

See the [IaC decision](ADR-18-iac-strategy.md),
[operations runbook](production-operations.md), and [changelog](../../CHANGELOG.md).
Original wording remains available with
`git show bb3ff44:docs/architecture/INCIDENT_KOYEB_TERRAFORM.md`.
