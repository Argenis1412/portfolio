# INC-009: Terraform Secret Identity Collision

**Historical report date:** 2026-05-08. **Recorded impact:** blocked Terraform apply.
The report describes an earlier state migration; original CI logs and live state
were not revalidated by this documentation audit.

## Failure and recorded fix

Renaming `for_each` keys, including `ENVIRONMENT` to `AMBIENTE`, changed Terraform
addresses while targeting existing Koyeb secrets. The reported create/destroy
sequence collided with occupied secret names.

[Commit 70a4ee4](https://github.com/Argenis1412/portfolio/commit/70a4ee4)
added explicit moved blocks to preserve state-address continuity. The
[current configuration](../../infrastructure/main.tf) retains these moves and
legacy registry keys while `app_key` exposes English application names.

## Current relevance

Resource addresses, physical secret names, and application keys are separate
identities. Preserve existing keys and inspect plans for replacement; a moved
block does not prevent replacement caused by other attribute changes. A historical
successful reconciliation does not guarantee every later plan is non-destructive.

Use the [infrastructure guide](../../infrastructure/README.md) and
[release checks](production-operations.md#release-checks) to verify environment
mapping and plans. This audit does not inspect secret values or reconcile live
state. Related reports are consolidated in the
[historical incident index](../../CHANGELOG.md#historical-engineering-notes).
