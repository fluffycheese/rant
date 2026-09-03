# RANT Demo Instance Guide

Setting up a public-facing demo instance of RANT requires two special environment variables.

1. `DEMO_MODE=true`: Disables the public `/api/import` endpoint to prevent vandalism.
2. `CRON_SECRET=your_secure_random_string`: Unlocks the hidden `/api/demo/reset` endpoint, which allows a cron job to bypass authentication and forcibly overwrite the database with a clean seed JSON file.

This guide explains how to deploy the demo on all three supported platforms.

---

## Prerequisites

You need a clean seed JSON file representing the "gold state" of your demo.
1. Run a normal RANT instance locally.
2. Build your perfect demo topology (Sites, Racks, Devices, Cables).
3. Go to **Admin > System Data** and click **Export JSON**.
4. Rename this file to `demo-seed.json`.

---

## ☁️ Cloudflare Pages + D1

Cloudflare Pages Functions do not natively support built-in Cron Triggers. The cleanest solution is to use a tiny **companion Cloudflare Worker** that runs on a schedule and hits your Pages project over the public internet.

### 1. Set Environment Variables on your Pages Project
In the Cloudflare Dashboard, go to your **Pages project -> Settings -> Environment Variables**. Add:
- `DEMO_MODE` = `true`
- `CRON_SECRET` = `your_secret_string`

**Important:** You must redeploy your project (or hit "Retry Deployment") for new environment variables to take effect!

### 2. Zero-Config Startup
That's it! When you visit your deployed site for the first time, RANT will detect that it is in Demo Mode with an empty database and **automatically seed the environment** with the bundled demo topology. You will not see a setup screen, and you can immediately log in with `demo / demo`.

### 3. Setting up the Auto-Reset Cron
Because the reset endpoint no longer requires the heavy `demo-seed.json` payload, you can trigger a reset from absolutely anywhere (GitHub Actions, uptime monitors, simple systemd timers, or cron-job.org) using a simple `curl` command:

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
3. To trigger the reset, you can use `curl` from a separate terminal:
   ```bash
   curl -X POST http://localhost:3001/api/demo/reset \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer local_test_secret" \
     -d @demo-seed.json
   ```
```
