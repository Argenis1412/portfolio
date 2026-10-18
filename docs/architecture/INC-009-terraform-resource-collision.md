# Incident Post-Mortem: INC-009

## Secret Identity Collision

**Recorded date:** 2026-05-08. **Affected release:** v1.8.1.
**Historical resolution:** v1.8.2. **Impact:** Blocked Terraform apply in CI/CD.

## Recorded failure and resolution

Renaming `for_each` resource keys, including `ENVIRONMENT` to `AMBIENTE`, changed
Terraform addresses while still targeting the same physical Koyeb secret names.
The resulting create/destroy operations collided with existing names.

Explicit `moved` blocks recorded the address changes in state. The historical
report described a resulting plan with zero resources to destroy. That result
belongs to the recorded reconciliation, not every future plan.

## Current boundary

`infrastructure/main.tf` retains the move declarations and stable legacy registry
keys, while `app_key` supplies English environment names. Resource identity,
physical secret name, and application key are distinct. Renaming an address
without state continuity can schedule replacement; a `moved` declaration does not
prevent replacement caused by other resource-attribute changes.

Preserve existing identities and inspect each plan for unexpected destruction.
This cleanup does not rename/delete resources, reconcile live state, or verify
secret values. Confirming `AMBIENTE=production` remains an operational prerequisite.

See the [IaC decision](ADR-18-iac-strategy.md),
[operations runbook](production-operations.md), and [changelog](../../CHANGELOG.md).
Original wording remains available with
`git show bb3ff44:docs/architecture/INC-009-terraform-resource-collision.md`.
