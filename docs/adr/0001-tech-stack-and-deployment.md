# ADR-0001: Technology Stack and Deployment Architecture

**Status:** Accepted  
**Date:** 2026-08-19

## Context

We are building RANT — a self-hosted network topology and infrastructure documentation tool. The reference point is ECCM, which is a single HTML file with no backend. RANT requires:

- Server-side data persistence (cross-site Cable Links require a shared, authoritative data store)
- Multi-rack, multi-site hierarchy (Site → Rack → Device → Port)
- Self-hostable with Docker
- Auth handled externally (Traefik forward auth → Keycloak)
- Usable by a small trusted team with equal access

## Decision

**Backend:** Node.js with a lightweight REST framework (Hono.js or Fastify).  
**Frontend:** React (SPA) + React Flow for the canvas, served as a static bundle by the backend.  
**Database:** SQLite via Drizzle ORM (using `better-sqlite3`). The repository layer is DB-agnostic so Postgres can be substituted without changing application logic.  
**Deployment:** Single Docker container. The SQLite file lives on a named Docker volume. No Docker Compose required for v1.  
**Auth:** None inside the application. The container sits behind Traefik with Keycloak forward auth. The app trusts all incoming requests as authenticated.  
**Concurrency:** Last-write-wins. No WebSockets or real-time sync.

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Single HTML file + nginx (extend ECCM) | No backend process = cannot implement a shared server-side data store; cross-site Cable Links require a single authoritative store |
| Astro frontend | Astro is SSG/content-oriented; RANT needs a persistent backend managing mutable relational data |
| Cloudflare Workers | No persistent filesystem; would require D1/KV storage split and a separate adapter per deployment target. Ruled out as deployment requirement was dropped |
| Docker Compose + Postgres from day one | More operational complexity for a small team; SQLite is sufficient for the write load and a migration path to Postgres is preserved via Drizzle |
| Real-time sync (WebSockets) | Significant engineering cost; collision rate for a small trusted team on infrastructure docs is low |
| In-app authentication | Duplicates the concern already handled by Traefik + Keycloak; adds maintenance burden |

## Consequences

- The SQLite volume file is the backup. Volume snapshots = full backup. No export/import feature needed.
- Device Templates are first-class in v1 (table in the schema) to avoid repetitive port entry across racks.
- Canvas scope is per-Rack. Cross-boundary Cable Links render as Link Stubs with navigation labels.
- Switching to Postgres later requires: changing the Drizzle driver config and running `drizzle-kit migrate`. No application logic changes.
