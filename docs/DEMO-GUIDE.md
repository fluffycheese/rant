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

### 2. Create the Auto-Reset Companion Worker
In the Cloudflare Dashboard, go to **Workers & Pages -> Create Application -> Create Worker**. Name it `rant-demo-cron`.

This Worker doesn't need any special bindings or backend linking to your Pages project; it simply makes a standard HTTP POST request to your Pages domain.

Edit the Worker code to the following:
```javascript
export default {
  async scheduled(event, env, ctx) {
    // 1. Paste your demo-seed.json content here
    const seedPayload = { ... }; 

    // 2. The target URL is injected via environment variables
    await fetch(env.TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.CRON_SECRET}`
      },
      body: JSON.stringify(seedPayload)
    });
  }
}
```

### 3. Configure the Companion Worker
On the newly created `rant-demo-cron` Worker's dashboard page:
1. Go to **Settings -> Variables and Secrets** and add:
   - `CRON_SECRET`: The exact same secret you used for the Pages project.
   - `TARGET_URL`: The full URL to your demo endpoint (e.g., `https://my-rant-demo.pages.dev/api/demo/reset`).
2. Go to **Triggers -> Cron Triggers** and add a new trigger (e.g., `0 */12 * * *` to run every 12 hours).

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
    volumes:
      - ./demo-seed.json:/demo-seed.json
    command: >
      /bin/sh -c "
      apk add --no-cache curl &&
      echo '0 */12 * * * curl -X POST http://rant-demo:3001/api/demo/reset -H \"Content-Type: application/json\" -H \"Authorization: Bearer my_super_secret_string\" -d @/demo-seed.json' | crontab - &&
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
  demoSeedPath = "/var/lib/rant/demo-seed.json";
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
      ExecStart = "${pkgs.curl}/bin/curl -X POST http://localhost:3001/api/demo/reset -H 'Content-Type: application/json' -H 'Authorization: Bearer ${cronSecret}' -d @${demoSeedPath}";
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
```
