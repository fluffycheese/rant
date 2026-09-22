# RANT — Schema & Cross-Platform Agent Guide

> **When to read this:** Any time you are modifying `src/db/schema.ts`, generating or editing a Drizzle migration file, writing bulk data insert logic, or doing any work that must be verified across Node.js (Docker/Nix) and Cloudflare Pages (D1).

---

## The D1 Table-Recreate Bug (CRITICAL)

**Cloudflare D1 silently ignores `PRAGMA foreign_keys=OFF;`.**

When `drizzle-kit` cannot express a schema change with a simple `ALTER TABLE` (e.g. dropping a column, changing a column type), it generates a migration that:
1. Creates `__new_<table>`
2. Copies data across
3. `DROP`s the original table

On standard SQLite this is safe because `PRAGMA foreign_keys=OFF` suppresses cascade deletes. **On D1 that pragma is ignored.** Dropping a parent table (e.g. `devices`) instantly triggers `ON DELETE CASCADE` and wipes all child records (`ports`, `cable_links`). This causes silent, irreversible data loss.

### Mitigation checklist — run after every `npm run db:generate`

1. Open every new `.sql` file in `drizzle/`.
2. **If you see `DROP TABLE` on any table that has child relationships — STOP.** Do not apply this migration as-is.
3. Prefer `ALTER TABLE ... ADD COLUMN ...` — SQLite supports this natively, even for columns with foreign keys.
4. If a recreate is strictly necessary (e.g. dropping a column), rewrite the migration manually:
   - Back up all affected child tables into `_bak` temporaries
   - Drop children, recreate parent, recreate children
   - `INSERT` data back from temporaries
   - Drop temporaries

### Parent → Child relationships (cascade targets)

| Parent table | Child tables |
|---|---|
| `users` | `sessions` |
| `profiles` | `sites` |
| `sites` | `racks`, `devices` (via `siteId`) |
| `racks` | `devices` (via `rackId`) |
| `devices` | `ports` |
| `ports` | `cable_links` (via `portAId` and `portBId`) |

---

## Schema Overview

[`src/db/schema.ts`](../../src/db/schema.ts) — Drizzle schema shared across all deployment targets.

```
users → sessions
profiles → sites → racks → devices → ports ⟷ cable_links
                         → device_templates (blueprint only, ports deep-copied on instantiate)
```

Key design decisions:
- **`templateId` on `devices`** uses `ON DELETE SET NULL` — deleting a template does not delete devices.
- **Dual-slot links:** `cable_links` stores `(portAId, portASlot, portBId, portBSlot)` where slot is `'front' | 'back'`. This lets a patch panel port carry one link on each side.
- **Port Groups are flat:** `ports` stores `groupName` + `groupLayout` strings — no separate table.
- **`isProtected` flag** on most tables — prevents deletion of demo seed data.

---

## Migration Workflow

```bash
# After editing src/db/schema.ts:
npm run db:generate      # generates a new file in drizzle/

# Review the generated SQL BEFORE applying it — check for DROP TABLE (see above)

# For local dev (auto-applies on server start — no manual step needed):
npm run dev:server

# For Cloudflare D1 (remote):
wrangler d1 migrations apply rant-db --remote
```

Migrations are applied automatically on Node.js startup via `entry.node.ts`. They are applied manually to D1 via wrangler before deployment.

---

## Cross-Platform Rules

### Password Hashing & Crypto
- Use **`crypto.subtle`** (Web Crypto API / PBKDF2) for all password hashing.
- Use **`crypto.randomUUID()`** for ID generation.
- Do NOT introduce `bcrypt`, `argon2`, or Node's `crypto` module — they do not work in Cloudflare Workers.
- Reference implementation: [`src/platform/crypto.ts`](../../src/platform/crypto.ts)

### Environment Variables & Config
- **Never** use `process.env` in `src/routes/`, `src/middleware/`, `src/db/schema.ts`, or any shared code.
- All config is accessed via `c.var.config` (injected by the platform entry point).
- Only `src/entry.node.ts` and `src/entry.cloudflare.ts` may read `process.env` or CF bindings.

### File System
- Cloudflare Pages Functions have **no access to the filesystem** at runtime.
- Do not use `fs` or `path` in any shared code. Static assets must be bundled at build time.

---

## D1 Batch & Payload Limits

Cloudflare D1 has strict limits on statement batch sizes and query execution time.

**Rule:** When inserting bulk data (e.g. instantiating a 48-port switch template), chunk inserts into arrays of **≤ 40 rows** to avoid D1 timeout and batch limit errors.

Example pattern already used in `src/routes/racks.ts`:
```ts
for (let i = 0; i < portIds.length; i += 40) {
  const chunk = portIds.slice(i, i + 40)
  const res = await db.select().from(ports).where(inArray(ports.id, chunk))
  portRows.push(...res)
}
```

Apply this same pattern to any bulk `INSERT`, `SELECT ... WHERE id IN (...)`, or multi-row operation.

---

## QA Sign-Off Checklist

Before finalising any schema or cross-platform change:

- [ ] Reviewed all new `.sql` files in `drizzle/` for `DROP TABLE` — rewrote if necessary
- [ ] No `process.env` or `fs` calls in shared code
- [ ] All crypto uses `crypto.subtle` / `crypto.randomUUID()`
- [ ] All bulk inserts chunked at ≤ 40 rows
- [ ] Tested locally with `npm run dev:server` (auto-migrates)
- [ ] Confirmed migration is safe to apply to D1 with `wrangler d1 migrations apply rant-db --remote`
