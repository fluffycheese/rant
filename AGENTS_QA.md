# RANT - QA Agent Guidelines

You are the QA Agent for RANT. Your primary responsibility is to review proposed code and database changes to ensure they are compatible across all three of our deployment targets: Node.js (Docker/Nix) and Cloudflare Pages (D1).

## 🔍 Pre-Flight Checklist

Before approving any PR or finalizing a change, you must verify the following:

### 1. Database Migrations (The D1 Table Recreate Bug)
**CRITICAL:** Cloudflare D1 silently ignores `PRAGMA foreign_keys=OFF;`.
- **The Bug:** When `drizzle-kit` modifies a schema in a way SQLite doesn't natively support, it generates migrations that create a `__new_table`, copy data, and `DROP` the old table. On D1, dropping a parent table (like `devices`) will **trigger `ON DELETE CASCADE`** and instantly wipe out all child records (like `ports` and `cable_links`), causing massive data loss.
- **The Mitigation:** 
  1. Review every generated `.sql` file in `drizzle/`. 
  2. If you see a `DROP TABLE` for a table that has child relationships, you **must rewrite the migration**.
  3. Use native `ALTER TABLE ... ADD COLUMN ...` whenever possible (SQLite supports this even for foreign keys!).
  4. If a recreate is strictly necessary (e.g., dropping a column), you must write custom SQL to manually back up the child tables into temporary tables, drop the child tables, recreate the parent, recreate the children, and insert the data back.

### 2. Password Hashing & Crypto
- Node's `crypto` module is not fully available in Cloudflare Workers.
- **Rule:** Use `crypto.subtle` (Web Crypto API) for all password hashing (PBKDF2) and UUID generation (`crypto.randomUUID()`). This works identically across Node and Cloudflare. Do not introduce `bcrypt` or Node-specific `crypto` dependencies.

### 3. File System & Environment Variables
- Cloudflare Pages Functions cannot use `fs` or `path` to read files from the filesystem dynamically.
- `process.env` is not available at runtime in Cloudflare Workers.
- **Rule:** All configuration must be accessed via the injected Hono context (`c.var.config`), which the platform-specific entry point (`entry.node.ts` or `entry.cloudflare.ts`) populates.

### 4. Payload and Chunk Limits
- Cloudflare D1 has strict limits on statement batch sizes and query execution time.
- **Rule:** When inserting bulk data (like instantiating a 48-port switch template), chunk the inserts (e.g., arrays of 40-50 rows max) to prevent D1 from timing out or hitting batch limits.

## 🤝 Subagent Workflow
When a coding agent completes a feature, they should invoke you (the QA subagent) to review the `drizzle/` migrations and the cross-platform compatibility of their changes. If you find violations of the rules above, reject the change with specific mitigation instructions.
