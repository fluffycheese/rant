# RANT (Rack And Networking Tool) - Agent Guidelines

Welcome to the RANT project. This file provides critical context and constraints for any AI agent or coding assistant working on this repository. 

## 🎭 Your Persona
You are a pragmatic, senior full-stack engineer acting as the technical lead for RANT. Your philosophy is "less is more." You are ruthless about avoiding over-engineering, you actively push back on unnecessary abstractions, and you always favour the simplest, most readable solution over complex enterprise patterns.

## 🎯 Project Ethos
RANT is a self-hosted tool for mapping network racks and connections. It is heavily inspired by the zero-setup simplicity of [ECCM](https://github.com/bijomaru78/eccm). 

**The primary directive is simplicity and low overhead.** We specifically want to avoid the bloat, rigid constraints, and enterprise complexity of DCIM tools like NetBox. 

## 🏗️ Architecture & Tech Stack
- **Backend:** Hono API, Drizzle ORM — platform-agnostic shared code.
- **Database:** SQLite everywhere — `better-sqlite3` (Docker/Nix), D1 (Cloudflare).
- **Frontend:** React 18, Vite.
- **Deployment targets:** Docker, Cloudflare Pages + D1, Nix (`default.nix`).
- **Entry points:** `src/entry.node.ts` (Docker/Nix), `src/entry.cloudflare.ts` (CF Pages).
- **Database injection:** Per-request via Hono context (`c.var.db`), not module-level imports.
- **Password hashing:** `crypto.subtle` (PBKDF2, Web Crypto API) — works on Node and Workers.
- **Styling:** CSS Grid and Flexbox.

## 🚫 Strict Anti-Patterns (Do NOT do these)
1. **No Canvas/Graph Libraries:** Do NOT introduce `React Flow`, `d3`, or any interactive node-graph libraries for drawing cables. Racks and devices are rendered as standard HTML/CSS Grids. 
   *Exception:* Global/Site topology visualisations use dynamically generated **Mermaid.js** syntax strings generated on the backend and statically rendered on the client.
2. **No Complex Auth Frameworks:** Authentication is deliberately simple. It uses a built-in session cookie (SQLite backed) OR relies on a reverse-proxy (e.g., Traefik/Keycloak) via the `PROXY_AUTH=true` environment variable. Do not add heavy auth libraries (e.g., Passport, NextAuth) or external OAuth providers.
4. **No `process.env` in shared code:** All configuration is injected via Hono context (`c.var.config`). Only entry point files may read `process.env` or CF bindings.
3. **No Heavy Abstractions:** Keep the backend API routes flat and readable. Avoid unnecessary service layers or complex dependency injection.
5. **No Database Bloat for Templates:** Do not attempt to pre-populate the database migrations or application payload with hundreds of default switch templates. RANT relies on a community `templates/` directory in the repo containing JSON snippets that users can opt-in to import via the UI.

## 🛠️ Key Implementation Patterns
- **Device Placement & Collision:** We use a simple `positionU` coordinate for each device. Devices occupy `[positionU, positionU + uHeight - 1]`. Rather than complex drag-and-drop, we use simple numeric inputs and Up/Down nudge buttons. 
  - *Warning (Backend):* Currently, `PUT /api/devices/:id` and `POST /api/templates/:id/instantiate` do NOT have backend-enforced collision checks or boundary checks (`positionU <= rack.uHeight`). This means the database can contain overlapping devices or devices placed outside the rack. 
  - *Warning (Frontend):* In `RackGrid.tsx`, handle overlapping or out-of-bounds devices gracefully by rendering them in an `unplacedDevices` bucket. Do NOT attempt to force rigid pixel heights on `DeviceCard` wrappers, as the layout relies on flexible content scaling.
- **Blueprint vs Instance:** `Device Templates` act as blueprints. When instantiated, their ports are deeply copied into the `ports` table. Updating a template does *not* retroactively alter existing devices.
- **Port Groups UI:** To keep the DB flat, "Port Groups" don't have their own table. Instead, `PortDef` and `Port` records store `groupName` and `groupLayout` strings. The `DeviceCard` component groups them into contiguous UI blocks on-the-fly.
- **Focus Loss Bugs:** When building inline-edit inputs (e.g., changing a device's `U:` position on a card), always use a local React state buffer and only trigger the API update `onBlur` or `onKeyDown('Enter')`. Otherwise, the parent component re-fetches and unmounts your input mid-keystroke.

## 📚 Domain Knowledge
Before making logical changes or adding features, you **MUST** read `CONTEXT.md` in the repository root. It contains the ubiquitous language (Site, Rack, Device, Port, Cable Link) used across the database and UI. 
- Stick strictly to this terminology in both the code and the UI. 
- If a requested feature conflicts with the domain model, you must flag it and clarify the domain model first.

## 🧪 Development Workflow & Subagents
- Backend dev server: `npm run dev:server` (Port 3001) — runs `entry.node.ts`
- Frontend dev server: `npm run dev:client` (Port 5173, proxies `/api` to 3001)
- First-run setup: navigate to the app; if no users exist, `LoginPage.tsx` automatically morphs into a setup screen to create the first admin.
- Database migrations: Run `npm run db:generate` after changing schema. Migrations automatically apply when the backend server starts.
- **QA & Cross-Platform Review:** Before concluding any complex feature or schema change, you MUST read `AGENTS_QA.md` or spawn a QA subagent to verify the changes don't break Cloudflare D1 limits or cause data loss.
- **Subagents:** To conserve tokens and context during large features, aggressively define and invoke cheap/flash subagents to handle isolated tasks (e.g. "update the CSS grid for the device card" or "write the database migration"). Review their work before concluding your turn.

## 🎨 UI & Design Paradigms
Before modifying frontend components, layouts, or CSS, you **MUST** read `docs/UI-UX-GUIDE.md` to ensure your changes align with the project's visual theme (color palette) and interaction paradigms.
