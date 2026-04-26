# Architecture Decision Record: JSON-First Read Path

## Context and Problem Statement
The portfolio application experienced cold-start latency issues, particularly impacting the primary read paths (`/about`, `/projects`, `/stack`). Because the application is hosted on a scaled-to-zero serverless or free-tier infrastructure, database connection pooling and initialization added 280-400ms to the first request. A fast, scalable solution was needed to serve the portfolio data without relying on the PostgreSQL database for read operations.

## Decision
We implemented a **JSON-First Read Path** strategy. All static and low-volatility portfolio data is pre-compiled into a structured JSON file during the deployment/build phase or is kept directly in memory. The read API endpoints serve data straight from this JSON file or memory layer.

## Consequences

### Positive
- **Zero Database Cold Starts:** Read requests for portfolio data bypass the PostgreSQL database entirely, dropping latency to <50ms.
- **High Scalability:** Serving static JSON is extremely lightweight and CPU-efficient.
- **Resilience:** The application remains fully functional for visitors even if the primary database is completely unavailable.

### Negative
- **Data Synchronization:** Any updates to portfolio data must be synced to the JSON files or re-deployed.
- **Not CRUD:** Modifying portfolio data is no longer a simple database UPDATE operation, requiring a deployment pipeline to update the static state.

## Related Incidents
- **INC-002**: Cold start latency 280-400ms despite keep-alive. Resolved by this ADR (v1.4.1).
