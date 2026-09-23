# RANT — Development Workflow & Subagent Guide

> **When to read this:** Dev environment setup, running servers, building for production, deploying, writing or invoking subagents, or understanding the multi-target build system.

---

## Local Development

### Prerequisites
- Node.js v20+, npm
- Python 3, make, g++ (required by `better-sqlite3` native compilation)
- On NixOS: `nix-shell -p python3 gnumake gcc` or use `shell.nix`

### First-Time Setup
```bash
npm install
cd client && npm install && cd ..
```

### Running the Dev Servers

Two terminals required — they work together:

```bash
# Terminal 1 — Backend API (port 3001)
npm run dev:server
# Runs entry.node.ts via tsx watch. Auto-applies DB migrations on start.
# SQLite database created at ./data/rant.db

# Terminal 2 — Frontend (port 5173)
npm run dev:client
# Vite dev server. Proxies /api/* to localhost:3001.
# Accessible on your local network via your IP address.
```

Navigate to `http://localhost:5173`. On first launch with an empty database, `LoginPage.tsx` automatically detects zero users and morphs into a setup screen to create the first admin.

---

## Build & Deployment

### Docker / Node.js Build
```bash
npm run build          # builds server (tsc) + client (vite)
npm start              # runs dist/entry.node.js
```

```bash
# Docker
docker build -t rant:latest .
docker run -d --name rant -p 3001:3001 -v rant_data:/app/data rant:latest
```

### Cloudflare Pages + D1 Build & Deploy
> [!WARNING]
> **CRITICAL PITFALL:** NEVER run `npm --prefix client run build` on its own before a Cloudflare deployment. Vite's `emptyOutDir: true` config will wipe the `dist/public` folder, **deleting the backend `_worker.js` API bundle**. This will cause all API routes (including authentication) to fail silently on Cloudflare Pages.
> Always use `npm run build:cf` which builds the frontend *and* re-bundles the backend worker.

```bash
npm run build:cf       # builds client + bundles worker via esbuild
npm run deploy:cf      # build:cf + migrate D1 + wrangler pages deploy
```

Manual steps if needed:
```bash
wrangler d1 migrations apply DB --remote
wrangler pages deploy dist/public
```

### Nix Build
```bash
nix-build              # produces ./result/bin/rant
./result/bin/rant      # starts on port 3001
```

> **Note:** First `nix-build` will fail with a hash mismatch for `npmDepsHash`. Copy the correct hash from the error output into `default.nix` and re-run. This is standard Nix behaviour.

---

## Database Migrations

```bash
npm run db:generate    # generates new SQL in drizzle/ after schema changes
```

- Migrations auto-apply on Node.js server start.
- For D1: apply manually with `wrangler d1 migrations apply DB --remote`.
- **Always review generated SQL before applying to D1.** See [`docs/agents/SCHEMA.md`](./SCHEMA.md) for the D1 DROP TABLE bug.

---

## Project Structure

```
src/                        ← Backend (shared across all targets)
├── app.ts                  ← Hono app factory (routes wired here)
├── entry.node.ts           ← Docker/Nix entry point
├── entry.cloudflare.ts     ← Cloudflare Pages entry point
├── db/
│   ├── schema.ts           ← Drizzle schema
│   └── connection.node.ts  ← Node.js SQLite connection factory
├── middleware/auth.ts
├── platform/
│   ├── types.ts            ← AppEnv type (Hono context variables)
│   └── crypto.ts           ← Web Crypto API helpers
├── routes/                 ← Flat Hono route files (one per resource)
└── services/               ← Heavy logic extracted from routes (import, demo)

client/src/                 ← React frontend
drizzle/                    ← Generated migration SQL files
templates/                  ← Community device template JSON snippets
docs/
├── UI-UX-GUIDE.md
├── agents/                 ← Specialist agent guides (this directory)
│   ├── FRONTEND.md
│   ├── SCHEMA.md
│   └── WORKFLOW.md
└── adr/                    ← Architecture Decision Records
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP listen port |
| `DATABASE_URL` | `/app/data/rant.db` | SQLite file path |
| `PROXY_AUTH` | `false` | Set `true` to disable built-in auth and trust upstream proxy |
| `DEMO_MODE` | — | Enables demo mode (protected resources, auto-reset banner) |

All runtime config is injected into the Hono context by the entry point. Never read `process.env` in shared route or middleware code.

---

## Subagent Patterns

To conserve tokens and context during large features, use subagents aggressively. Principles:

- **Isolate:** Give each subagent a single, well-scoped task with clear inputs and expected outputs.
- **Cheap models for focused tasks:** File edits, CSS tweaks, migration writes — use `flash` or `flash_lite`.
- **Pro model for reasoning:** Multi-file refactors, architecture decisions, debugging subtle bugs.
- **Always review** subagent output before concluding your turn — don't blindly accept.

### Example subagent splits for a schema + UI feature:

```
Subagent A (flash): "Write the Drizzle schema addition for X. Output only the schema.ts diff."
Subagent B (flash): "Write the SQL migration for X (ADD COLUMN only — see SCHEMA.md for D1 rules)."
Subagent C (flash): "Update ConnectionsTable.tsx to display the new X column."
Parent agent:       Review all three, apply, run QA checklist from SCHEMA.md.
```

### QA Subagent

Before concluding any schema change or complex cross-platform feature, spawn or invoke a QA pass using the checklist in [`docs/agents/SCHEMA.md`](./SCHEMA.md#qa-sign-off-checklist).

---

## Auth & User Management

- **Built-in auth (default):** Session cookie, SQLite-backed. Navigate to `/admin` to manage users.
- **Proxy auth:** Set `PROXY_AUTH=true`. Built-in login is disabled; RANT trusts `X-Remote-User` from the upstream proxy (Traefik, Keycloak, Authelia, Cloudflare Access).
- **First-run setup:** `GET /api/auth/setup/status` → if `needsSetup: true`, the login page morphs into a setup form. The `POST /api/auth/setup` endpoint is only available when zero users exist.
- User management is automatically hidden in the UI when `PROXY_AUTH=true`.
