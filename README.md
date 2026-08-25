# RANT (Rack And Networking Tool)

> [!WARNING]
> **ALPHA BUILD - HEAVY DEVELOPMENT**
> This repository is currently in an early Alpha state and is undergoing heavy, rapid development. Things *will* break, APIs will change without warning, and the database schema is not guaranteed to be stable. Use in production environments at your own risk!

A lightweight, self-hosted tool for documenting racks, patching cables, and visualising network topology — without the overhead of enterprise DCIM.

> [!TIP]
> **Are you an end-user?** 📖 [Read the User Guide](./docs/USER-GUIDE.md) to learn how to wire up your first rack and master cross-site patching.
> 
> **Are you a contributor or AI agent?** 🛠️ [Read the UI/UX Design Guide](./docs/UI-UX-GUIDE.md) and [AGENTS.md](./AGENTS.md) before making code changes.

---

## 📖 Why RANT exists

If you've ever needed to document a network rack, you've probably hit the same wall:

**On one side**, there are brilliant single-purpose tools like [ECCM](https://github.com/bijomaru78/eccm) and [Rackula](https://github.com/RackulaLives/Rackula) — fast, focused, and easy to use. But they each solve only *half* the problem. ECCM maps cable connections beautifully but has no concept of racks or sites. Rackula renders gorgeous rack elevations but has no cable awareness at all.

**On the other side**, there's [NetBox](https://github.com/netbox-community/netbox) — the industry standard for data centre infrastructure management. It does everything: IPAM, circuits, power, tenancy, custom fields, plugins, REST + GraphQL APIs. It's phenomenal software. But it requires PostgreSQL, Redis, a task queue, and dedicated maintenance — serious infrastructure for what might be a 12-device homelab or a 3-rack comms room.

**There was nothing in between.** No tool that combined rack layout with cable documentation in a single, lightweight, self-hosted package. RANT fills that gap.

### How RANT compares

#### Features

| | RANT | [ECCM](https://github.com/bijomaru78/eccm) | [Rackula](https://github.com/RackulaLives/Rackula) | [NetBox](https://github.com/netbox-community/netbox) | [RackTables](https://www.racktables.org/) | [openDCIM](https://opendcim.org/) |
|---|---|---|---|---|---|---|
| **Rack layout** | ✅ U-position, collision detection | ❌ No rack concept | ✅ Drag-and-drop, real device images | ✅ Full elevation views | ✅ Basic | ✅ Full + power/cooling |
| **Cable documentation** | ✅ Port-to-port, front/back slots, cross-site | ✅ Excellent — its core strength | ❌ None | ✅ Full cable tracing | ✅ Physical ports | ⚠️ Limited |
| **Multi-site topology** | ✅ Profile → Site → Rack → Device hierarchy, Mermaid diagrams | ❌ Single-page, no hierarchy | ❌ Single rack at a time | ✅ Full multi-tenancy | ✅ Locations | ✅ Data centres |
| **Shared database** | ✅ SQLite (team access via server) | ❌ Browser localStorage only | ⚠️ Optional backend | ✅ PostgreSQL | ✅ MySQL | ✅ MySQL |
| **IPAM / VLANs** | ❌ Out of scope | ❌ | ❌ | ✅ Full IPAM | ⚠️ Basic | ❌ |
| **Automation API** | ✅ REST API | ❌ | ❌ | ✅ REST + GraphQL + webhooks | ⚠️ Basic | ⚠️ Basic |

#### Deployment

> **Key:** 🟢 Minimal effort — 🟡 Moderate effort — 🔴 Significant effort or complexity

| | RANT | [ECCM](https://github.com/bijomaru78/eccm) | [Rackula](https://github.com/RackulaLives/Rackula) | [NetBox](https://github.com/netbox-community/netbox) | [RackTables](https://www.racktables.org/) | [openDCIM](https://opendcim.org/) |
|---|---|---|---|---|---|---|
| **Initial setup** | 🟢 Single container or `nix-build` | 🟢 Open a file | 🟢 Single container | 🔴 Multi-service stack, migrations, workers | 🟡 LAMP provisioning + schema | 🟡 LAMP provisioning + schema |
| **Rack documentation** | 🟢 Define and go | — | 🟢 Drag-and-drop | 🟡 Device-types, roles, manufacturers first | 🟢 Straightforward | 🟡 Power/cooling modelling |
| **Cable documentation** | 🟢 Click-to-patch | 🟢 Drag-and-drop | — | 🔴 Cable types, terminations, rear ports | 🟡 Manual configuration | — |
| **Multi-site** | 🟢 Create sites, add racks | — | — | 🔴 Regions, site groups, locations, tenancy | 🟡 Location hierarchy | 🟡 DC hierarchy |
| **Dependencies** | 🟢 Node.js, SQLite | 🟢 None (static HTML) | 🟢 Node.js | 🔴 Python, PostgreSQL, Redis | 🟡 PHP, MySQL, Apache | 🟡 PHP, MySQL, Apache |
| **Best for** | Small teams documenting real racks with real cables | Quick personal cable maps | Planning rack layouts before buying | Enterprise source-of-truth + automation | Legacy asset tracking | Physical capacity planning |
| **Stack** | Modern (Hono, React, Drizzle, Vite) | Vanilla HTML/JS | React | Django + Python | PHP | PHP |

### Design philosophy

RANT takes direct inspiration from two excellent projects:

- **[ECCM](https://github.com/bijomaru78/eccm)** by bijomaru78 — RANT's card-based port grid and "click to patch" interaction pattern come straight from ECCM's zero-friction design. We owe this project a huge debt for proving that cable documentation doesn't need to be painful.
- **[NetBox](https://github.com/netbox-community/netbox)** by the NetBox community — RANT's data model (Profiles → Sites → Racks → Devices → Ports) borrows heavily from NetBox's proven hierarchy. We just strip away the parts that most small teams never use (IPAM, circuits, tenancy, power).

The guiding principle: **if you can draw your network on a whiteboard in 10 minutes, you should be able to document it in RANT in 10 minutes.**

## 🚀 Deployment Options

RANT supports three deployment methods from the same codebase. Choose based on your environment and priorities.

| | Docker | Cloudflare Pages + D1 | Nix |
|---|---|---|---|
| **Best for** | Familiar tooling, existing container infrastructure | Zero-ops hosting, automatic global CDN, CI/CD from Git | NixOS users, reproducible builds, auditable deployments |
| **Database** | SQLite file on a Docker volume | Cloudflare D1 (managed SQLite) | SQLite file on disk |
| **Auth options** | Built-in session login **or** proxy auth (Traefik/Keycloak) | Built-in session login **or** Cloudflare Access | Built-in session login **or** proxy auth |
| **Scaling** | Single instance (SQLite limitation) | Edge-distributed workers, single D1 database | Single instance |
| **Backup** | Volume snapshot | D1 automatic backups + time travel | File copy / snapshot |
| **Cost** | Self-hosted (your hardware) | Free tier available (100k requests/day, 5GB D1) | Self-hosted (your hardware) |
| **Ops overhead** | Low — `docker run` | Minimal — push to Git, auto-deploys | Low — `nix-build`, systemd service |
| **Immutability** | Container images are immutable | Platform-managed | Full Nix store isolation and reproducibility |

---

### 🐳 Docker

The easiest way to deploy RANT on your own infrastructure.

```bash
docker build -t rant:latest .

docker run -d \
  --name rant \
  -p 3001:3001 \
  -v rant_data:/app/data \
  --restart unless-stopped \
  rant:latest
```

Access the application at `http://localhost:3001`. On first launch, navigate to the app and you will be prompted to create your first admin user.

**Proxy Auth (Traefik / Keycloak / Authelia):**
If you already use a reverse proxy for authentication, disable the built-in login screen:
```bash
docker run -d \
  --name rant \
  -p 3001:3001 \
  -e PROXY_AUTH=true \
  -v rant_data:/app/data \
  rant:latest
```

**Environment Variables:**

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP listen port |
| `DATABASE_URL` | `/app/data/rant.db` | Path to the SQLite database file |
| `PROXY_AUTH` | `false` | Set to `true` to disable built-in auth and trust the upstream proxy |

---

### ☁️ Cloudflare Pages + D1

Zero-ops deployment with automatic HTTPS, global CDN, and managed SQLite.

#### Prerequisites
- A Cloudflare account
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed (`npm install -g wrangler`)
- Authenticated with Cloudflare: `wrangler login`

#### Setup

1. **Create a D1 database:**
   ```bash
   wrangler d1 create rant-db
   ```
   Copy the `wrangler.example.toml` file to `wrangler.toml`
   ```bash
   cp wrangler.example.toml wrangler.toml
   ```
  Then copy the `database_id` from the terminal output and paste it into `wrangler.toml`.

2. **Apply database migrations:**
   ```bash
   wrangler d1 migrations apply rant-db --remote
   ```

3. **Install dependencies and build:**
   ```bash
   npm install
   cd client && npm install
   cd ..
   npm run build:cf
   ```

4. **Deploy to Cloudflare Pages:**
   ```bash
   wrangler pages deploy dist/public
   ```

5. **Set environment variables** (optional):
   ```bash
   wrangler pages secret put PROXY_AUTH  # Enter 'true' when prompted
   ```

On first launch, navigate to the app and create your first admin user via the setup screen.

#### CI/CD with Git

Connect your repository to Cloudflare Pages for automatic deployments on push:

1. Go to **Cloudflare Dashboard → Pages → Create a project**
2. Connect your Git repository
3. Set the build command to `npm run build:cf`
4. Set the build output directory to `dist/public`
5. Add the D1 database binding in **Settings → Functions → D1 database bindings** (variable name: `DB`)

#### Limitations

- D1 has a 10GB database size limit (more than sufficient for network documentation)
- Free tier: 100,000 requests/day, 5 million rows read/day
- Workers have a 10ms CPU time limit on the free plan (30ms on paid)

---

### ❄️ Nix

Reproducible, auditable builds for NixOS users. The `default.nix` derivation compiles the server, builds the React client, and produces a `bin/rant` wrapper.

#### Build

```bash
nix-build
```

> **Note:** On first build, `nix-build` will fail with a hash mismatch for `npmDepsHash`. Copy the correct hash from the error message into `default.nix` and run `nix-build` again. This is standard Nix behaviour for npm packages.

#### Run

```bash
./result/bin/rant
```

RANT will start on port 3001 with the database at `./data/rant.db`. Navigate to the app to create your first admin user.

#### Install into your profile

```bash
nix-env -if .
rant
```

#### Environment Variables

The same environment variables as Docker apply (`PORT`, `DATABASE_URL`, `PROXY_AUTH`):

```bash
DATABASE_URL=/var/lib/rant/rant.db PORT=8080 rant
```

#### NixOS Service (example)

To run RANT as a systemd service on NixOS, add to your configuration:

```nix
{ pkgs, ... }:

let
  rant = import /path/to/rant { inherit pkgs; };
in {
  systemd.services.rant = {
    description = "RANT - Rack And Networking Tool";
    after = [ "network.target" ];
    wantedBy = [ "multi-user.target" ];

    serviceConfig = {
      ExecStart = "${rant}/bin/rant";
      Environment = [
        "DATABASE_URL=/var/lib/rant/rant.db"
        "PORT=3001"
        "NODE_ENV=production"
      ];
      StateDirectory = "rant";
      DynamicUser = true;
      Restart = "on-failure";
    };
  };
}
```

---

## 🛠️ Local Development

RANT is built with a Node.js / Hono backend and a React 18 / Vite frontend.

### Prerequisites
- Node.js (v20+)
- npm
- Python 3, make, g++ (required by `better-sqlite3` native compilation)

On NixOS, use `nix-shell -p python3 gnumake gcc` or add these to your dev shell.

### Setup

1. **Install dependencies**
   ```bash
   npm install
   cd client && npm install
   cd ..
   ```

2. **Run the Backend (API)**
   ```bash
   npm run dev:server
   ```
   *Runs the Hono server on port 3001. The SQLite database and tables will be automatically created in `./data/rant.db` on startup.*

3. **Run the Frontend (Client)**
   In a second terminal:
   ```bash
   npm run dev:client
   ```
   *Runs the Vite dev server on port 5173. It is configured with `--host` by default, meaning you (and anyone else on your local network) can access the app by navigating to `http://<YOUR_IP_ADDRESS>:5173`. API requests are automatically proxied back to the Node server.*

### First-Run Setup

On first launch with an empty database, navigate to the app. You'll be prompted to create your first admin user. This replaces the old `create-admin.ts` script.

### User Management & Password Changes

When running with built-in authentication (default), navigate to **Users (Admin)** (`/admin`) from the sidebar footer to:
- Create additional team member accounts
- Update user passwords
- Remove users (with safety protection preventing deletion of the last user)

*Note: User management is automatically disabled when `PROXY_AUTH=true` is enabled.*

### Architecture

```
src/
├── platform/         ← Shared types and cross-platform crypto
├── db/
│   ├── schema.ts     ← Drizzle schema (shared across all targets)
│   └── connection.node.ts  ← Node.js SQLite connection factory
├── middleware/        ← Auth middleware (uses injected db/config)
├── routes/            ← API routes (100% shared, no platform-specific code)
├── app.ts             ← Shared Hono app factory
├── entry.node.ts      ← Docker/Nix entry point
└── entry.cloudflare.ts ← Cloudflare Pages entry point
```
