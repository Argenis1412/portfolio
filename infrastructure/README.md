# Infrastructure

[Terraform configuration](main.tf) manages the Koyeb app, API service, custom
backend domain, and secret resources. GitHub Actions supplies values through
`TF_VAR_*`. External Redis, email, and frontend hosting accounts are configured
separately; this repository does not provision complete infrastructure parity.

## Declared deployment

- App `argenis-portfolio`, service `api`, domain `api.argenisbackend.com`.
- Git source `main`, repository-root build context, `backend/Dockerfile`, port 8000.
- Instance type `free`, region `was`, scaling min 0 / max 1.
- HTTP health probe `/health`; an HTTP 200 can contain a degraded JSON body.
- Vercel builds `frontend/` with `npm run build`, serves `dist`, and uses
  [rewrites/headers](../frontend/vercel.json). Set `VITE_API_URL` to the API base
  ending in `/api/v1`; see [frontend configuration](../frontend/README.md#development-and-checks).

These are source settings. Current provider quotas, pricing, live resources,
execution mode, and deployed commits are not established by the configuration.

## Variables and identities

[variables.tf](variables.tf) defines required inputs and defaults. The
[infrastructure workflow](../.github/workflows/infrastructure.yml) maps GitHub
secrets to those inputs; provider authentication uses `KOYEB_TOKEN`, and HCP
Terraform authentication uses `TF_API_TOKEN`. There is no `TF_VAR_koyeb_token` input.
The cloud block selects organization `portafolio`, workspace `portfolio-infra`.
Confirm workspace execution settings before using runner-provided variables.

| Stable registry/GitHub name | Application key |
|---|---|
| `AMBIENTE` | `ENVIRONMENT` |
| `NOME_APP` | `APP_NAME` |
| `ORIGENS_PERMITIDAS` | `ALLOWED_ORIGINS` |
| `REGEX_ORIGENS_PERMITIDAS` | `REGEX_ALLOWED_ORIGINS` |

Other registry entries retain their names. Empty/null values are filtered before
creating secrets. The registry still contains `DATABASE_URL`, and Terraform still
requires its input, although application SQL is retired. Retained secret wiring
does not authorize deleting external database resources.

Resource addresses, physical Koyeb secret names, and application keys are distinct.
Keep existing moved blocks and registry identities; see the historical
[INC-009 report](../docs/architecture/INC-009-terraform-resource-collision.md).
State may contain sensitive values even when variables are marked sensitive.

## Review and release

After configuring all required inputs and credentials outside Git, from this directory:

```bash
terraform init
terraform fmt -check
terraform plan
```

The workflow initializes with `-upgrade`, plans on main-targeting PRs and main
pushes, and applies automatically on pushes to `main`; it has no path filter.
A plan is not an atomic deployment guarantee. Review resource replacements,
secret mappings, and recovery options before release. Production requirements,
current verification gaps, and rollback checks are in the
[operations runbook](../docs/architecture/production-operations.md).
