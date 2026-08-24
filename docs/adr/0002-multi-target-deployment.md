# Multi-Target Deployment Architecture

**Status:** Accepted (supersedes ADR-0001 Cloudflare Workers rejection)
**Date:** 2026-08-23

## Context

ADR-0001 rejected Cloudflare Workers because it would "require D1/KV storage split and a separate adapter per deployment target." The project's scope has since expanded: RANT should be deployable via Docker (original target), Cloudflare Pages + D1 (zero-ops hosting), and Nix (immutable, auditable builds) — all from a single codebase.

## Decision

We adopt a **platform adapter** pattern. Shared code (routes, schema, validation, business logic) comprises ~95% of the codebase and is deployment-agnostic. Only three thin layers vary per target:

1. **Entry point** (`entry.node.ts`, `entry.cloudflare.ts`) — bootstraps the Hono app, injects database and config, starts the server or exports the Worker.
2. **Database connection** — `better-sqlite3` for Docker/Nix (file on disk), `drizzle-orm/d1` for Cloudflare (D1 binding).
3. **Migrations** — programmatic on startup for Docker/Nix, `wrangler d1 migrations apply` CLI for Cloudflare.

Config and database are injected per-request via Hono middleware (`c.var.db`, `c.var.config`) rather than module-level singletons. This makes the code testable and platform-agnostic.

Password hashing uses `crypto.subtle` (Web Crypto API, PBKDF2) universally — works on both Node.js and Cloudflare Workers. This replaces the previous `crypto.scryptSync` (Node-only).

The Drizzle schema remains `sqlite-core` only. Postgres support is not included; all three targets use SQLite.

## Considered Alternatives

| Option | Rejected because |
|---|---|
| Platform-specific crypto adapters (scrypt for Node, PBKDF2 for CF) | Two code paths, incompatible password hashes between targets |
| `process.env` with `nodejs_compat` flag on CF | Relies on compatibility flag; makes config implicit and hard to test |
| Postgres support alongside SQLite | Requires maintaining two schema files; all three targets are SQLite |
| Nix flakes | Adds complexity; `default.nix` with `buildNpmPackage` is sufficient |

## Consequences

- Module-level `import { db }` is replaced with per-request `c.var.db` in all route files.
- `create-admin.ts` is replaced by a self-service `/api/auth/setup` endpoint (works on all targets).
- ADR-0001's rejection of Cloudflare Workers is reversed.
- Adding a new deployment target requires only a new entry point file (~30 lines) and deployment config.
