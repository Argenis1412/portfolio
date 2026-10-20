# Case Study: INC-002 (Cold Start Latency)

**Historical period:** v1.2.0 to v1.4.1. **Recorded classification:** `REAL`.
The original report cited Koyeb metrics and Supabase connection logs. Those raw
sources were not revalidated for this cleanup; the classification records the
report's provenance, not a new confidence assessment.

## Recorded incident

Initial portfolio reads showed P95 latency of 280-400 ms despite a 14-minute
keep-alive targeting `/health`. The investigation attributed the remaining
latency to PostgreSQL connection overhead rather than API container sleep.
The incident illustrates why a fast probe does not establish a fast user path.

| Historical comparison | Before | Reported after JSON-first reads |
|---|---|---|
| Data-read P95 | About 320 ms | Below 50 ms |
| Read dependency | Remote PostgreSQL connection | Local JSON content |

These figures describe the report's release context, not this branch's measured
performance. The former descriptions of memory-mapped files, zero I/O on every
read, and startup preloading do not describe the current repository.

## Current relevance

`JsonRepository` reads files on demand and caches successful values per instance;
SQL is removed from application paths, including contact. `/health` checks JSON
files independently of that cache. No current database mutation path or
sub-50 ms latency guarantee follows from the historical incident.

See the [JSON decision](../architecture/JSON_FIRST_READ_PATH.md),
[SLO measurement limits](../architecture/SLO_DEFINITIONS.md), and
[incident history](../../CHANGELOG.md). Original wording remains available with
`git show bb3ff44:docs/case_studies/INC-002_cold_start.md`.
