# RANT Demo Instance Guide

Setting up a public-facing demo instance of RANT requires two special environment variables.

1. `DEMO_MODE=true`: Disables the public `/api/import` endpoint to prevent vandalism.
2. `CRON_SECRET=your_secure_random_string`: Unlocks the hidden `/api/demo/reset` endpoint, which allows a cron job to bypass authentication and forcibly overwrite the database with a clean seed JSON file.

This guide explains how to deploy the demo on all three supported platforms.

---

## 1. Preparing the "Gold State" (Implementation)

The demo topology is natively bundled into the RANT backend at build time. To create or update this baseline:

1. Run a standard, non-demo RANT instance locally (`npm run dev:server` and `npm run dev:client`).
2. Build your perfect demo environment: create Sites, populate Racks with Devices, and connect Ports.
3. In the UI, navigate to **Admin > System Data** and click **Export JSON**.
4. **CRITICAL:** Save and overwrite the exported file directly to `src/db/demo-seed.json` in your repository.

Because this file is bundled via esbuild during compilation (bypassing Cloudflare environment variable limits), any changes to `demo-seed.json` **require a full recompilation and redeployment** of your code.

---

## 2. Redeploying the Demo (Updates)

Whenever you update `src/db/demo-seed.json` or update the database schema, you must redeploy and manually trigger the reset. The live database will **never** automatically overwrite itself if it already contains data.

### Cloudflare Pages + D1 Workflow

1. **Apply Schema Migrations:** If you changed `schema.ts`, you must explicitly apply migrations to production. Cloudflare does not do this automatically on deploy.
   ```bash
   npx wrangler d1 migrations apply <YOUR_DB_NAME> --remote
   ```
2. **Recompile the Backend:** The backend must be rebuilt so the new `demo-seed.json` is bundled into `_worker.js`.
   ```bash
   npm run build:cf
   ```
3. **Deploy the Code:**
   ```bash
   wrangler pages deploy dist/public
   ```
4. **Force the Reset:** See step 3 below to force the live database to wipe and absorb the new bundled seed.

### Docker Workflow
1. Rebuild your Docker image to bundle the new `demo-seed.json`:
   ```bash
   docker build -t rant:latest .
   ```
2. Restart your containers (`docker compose up -d`).
3. Force the reset (Step 3).

---

## 3. Triggering the Demo Reset

## ☁️ Cloudflare Pages (Auto-Reset Cron)

Cloudflare Pages Functions do not natively support built-in Cron Triggers. However, you can trigger a reset from absolutely anywhere (GitHub Actions, uptime monitors, simple systemd timers, or cron-job.org) using a simple `curl` command.

### 1. Set Environment Variables
In the Cloudflare Dashboard, go to your **Pages project -> Settings -> Environment Variables**. Add:
- `DEMO_MODE` = `true`
- `CRON_SECRET` = `your_secret_string`

**Important:** You must redeploy your project (or hit "Retry Deployment") for new environment variables to take effect!

### 2. Zero-Config First Startup
When you visit your freshly deployed site for the very first time (when the database is completely empty), RANT will detect `DEMO_MODE=true` and **automatically seed the environment** with the bundled topology. You can immediately log in with `demo / demo`.

### 3. The Reset Command
To trigger a periodic reset of a populated database (e.g. via a Cron service), run:

```bash
curl -X POST https://your-demo.pages.dev/api/demo/reset \
     -H "Authorization: Bearer your_secret_string"
```

---

## 🐳 Docker

For Docker, we deploy the main application container and use a lightweight `alpine/curl` sidecar container to trigger the reset.

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  rant-demo:
    image: rant:latest
    ports:
      - "3001:3001"
    environment:
      - DEMO_MODE=true
      - CRON_SECRET=my_super_secret_string
    volumes:
      - rant_data:/app/data
    restart: unless-stopped

  rant-reset-cron:
    image: alpine:latest
    command: >
      /bin/sh -c "
      apk add --no-cache curl &&
      echo '0 */12 * * * curl -X POST http://rant-demo:3001/api/demo/reset -H \"Authorization: Bearer my_super_secret_string\"' | crontab - &&
      crond -f -d 8
      "
    restart: unless-stopped

volumes:
  rant_data:
```

---

## ❄️ NixOS

On NixOS, you run the main application as a systemd service, and use systemd timers to trigger the reset via `curl`.

### `configuration.nix`

```nix
{ pkgs, ... }:

let
  rant = import /path/to/rant { inherit pkgs; };
  cronSecret = "my_super_secret_string";
in {
  # 1. The main application
  systemd.services.rant = {
    description = "RANT Demo Instance";
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      ExecStart = "${rant}/bin/rant";
      Environment = [
        "DATABASE_URL=/var/lib/rant/rant.db"
        "PORT=3001"
        "DEMO_MODE=true"
        "CRON_SECRET=${cronSecret}"
      ];
      StateDirectory = "rant";
      DynamicUser = true;
    };
  };

  # 2. The reset script
  systemd.services.rant-demo-reset = {
    description = "Reset RANT Demo Topology";
    serviceConfig = {
      Type = "oneshot";
      ExecStart = "${pkgs.curl}/bin/curl -X POST http://localhost:3001/api/demo/reset -H 'Authorization: Bearer ${cronSecret}'";
    };
  };

  # 3. The timer (runs every 12 hours)
  systemd.timers.rant-demo-reset = {
    wantedBy = [ "timers.target" ];
    timerConfig = {
      OnCalendar = "*-*-* 00/12:00:00";
      Persistent = true;
    };
  };
}

---

## 💻 Local Development

If you are contributing to RANT and want to test the Demo Mode locally:

1. Create a `.env` file in the project root:
   ```env
   DEMO_MODE=true
   CRON_SECRET=local_test_secret
   ```
2. Start the development servers as usual:
   ```bash
   npm run dev:server
   npm run dev:client
   ```
3. To test the reset functionality locally, run:
   ```bash
   curl -X POST http://localhost:3001/api/demo/reset \
     -H "Authorization: Bearer local_test_secret"
   ```
