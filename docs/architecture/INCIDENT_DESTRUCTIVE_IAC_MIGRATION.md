# Incident Post-Mortem: INC-008

## Destructive IaC Migration

**Recorded date:** 2026-05-07. **Severity:** P2, planned migration downtime.
**Recorded downtime:** 14 hours. **Historical status:** Migration completed.
This report records an earlier operational decision, not a migration procedure
or authorization to delete resources during the cleanup.

## Recorded event

The manual Koyeb service held the API domain while Terraform attempted to claim
ownership. The report attributed the conflict to the then-observed service/domain
constraints. The chosen migration deleted the manual deployment before creating
the managed replacement; API unavailability and platform-level 502s were recorded
during reconciliation.

The earlier narrative also recorded a move to the `was` region and re-established
email credentials. Those are historical actions, not live verification of today's
region, credentials, or platform quotas. The report does not establish that
import or another non-destructive approach is impossible in a future migration.

## Lessons and current boundary

The event demonstrates the availability cost of delete-before-create. It does
not prove that deleting unmanaged resources is necessary for reproducibility or
that a Terraform apply recreates all dependencies atomically. A successful rebuild
at one point is not a guarantee of complete or ongoing environment parity.

For future ownership changes, inspect state, supported import/move mechanisms,
plans, dependencies, and recovery options before choosing a migration. Preserve
existing resources and secret identities in this cleanup. No apply, deletion,
credential rotation, or current provider quota check was performed here.

See the [IaC decision](ADR-18-iac-strategy.md),
[identity collision](INC-009-terraform-resource-collision.md),
[operations runbook](production-operations.md), and [changelog](../../CHANGELOG.md).
Original wording remains available with
`git show bb3ff44:docs/architecture/INCIDENT_DESTRUCTIVE_IAC_MIGRATION.md`.
