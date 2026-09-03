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
- **Styling:** All frontend styling uses React inline `CSSProperties` objects. There are NO `.css` files, CSS modules, or utility class libraries (no Tailwind). Every style property is passed as a `style={{...}}` prop. Do not introduce any external style mechanism.

## 🚫 Strict Anti-Patterns (Do NOT do these)
1. **No Canvas/Graph Libraries:** Do NOT introduce `React Flow`, `d3`, or any interactive node-graph libraries for drawing cables. Racks and devices are rendered as standard HTML/CSS Grids. 
   *Exception:* Global/Site topology visualisations use dynamically generated **Mermaid.js** syntax strings generated on the backend and statically rendered on the client.
2. **No Complex Auth Frameworks:** Authentication is deliberately simple. It uses a built-in session cookie (SQLite backed) OR relies on a reverse-proxy (e.g., Traefik/Keycloak) via the `PROXY_AUTH=true` environment variable. Do not add heavy auth libraries (e.g., Passport, NextAuth) or external OAuth providers.
4. **No `process.env` in shared code:** All configuration is injected via Hono context (`c.var.config`). Only entry point files may read `process.env` or CF bindings.
3. **No Heavy Abstractions:** Keep the backend API routes flat and readable. Avoid unnecessary service layers or complex dependency injection.
5. **No Database Bloat for Templates:** Do not attempt to pre-populate the database migrations or application payload with hundreds of default switch templates. RANT relies on a community `templates/` directory in the repo containing JSON snippets that users can opt-in to import via the UI.
6. **No external CSS:** Do not add `.css` files, CSS modules, `styled-components`, or Tailwind to the frontend. All styling is inline `CSSProperties`. See `docs/adr/0003-inline-css-only.md`.
7. **No Reinventing the Wheel (KISS Principle):** Before writing new complex state management logic or layout hacks (e.g., trying to manually sync UI states like Split View by adding React `key` prop remount hacks), you **MUST** look for existing context functions or patterns that already solve the problem. If a feature (like opening a cross-rack view) works in one part of the app, trace exactly how that component does it and reuse that exact logic.

## 🛠️ Key Implementation Patterns
- **Triggering Split View:** To programmatically open the Split View (e.g., from a global topology map or trace panel), do not manipulate the DOM or hack component keys. Simply call `setIsManualSplitView(true)` and `setCrossSiteTargetRackId(targetId)` from the global `usePatching()` context, then navigate to the primary rack. The `RackViewPage` layout will automatically react and correctly collapse sidebars and panels.
- **Device Placement & Collision:** We use a simple `positionU` coordinate for each device. Devices occupy `[positionU, positionU + uHeight - 1]`. Rather than complex drag-and-drop, we use simple numeric inputs and Up/Down nudge buttons. 
  - *Warning (Backend):* Currently, `PUT /api/devices/:id` and `POST /api/templates/:id/instantiate` do NOT have backend-enforced collision checks or boundary checks (`positionU <= rack.uHeight`). This means the database can contain overlapping devices or devices placed outside the rack. 
  - *Warning (Frontend):* In `RackGrid.tsx`, handle overlapping or out-of-bounds devices gracefully by rendering them in an `unplacedDevices` bucket. Do NOT attempt to force rigid pixel heights on `DeviceCard` wrappers, as the layout relies on flexible content scaling.
- **Blueprint vs Instance:** `Device Templates` act as blueprints. When instantiated, their ports are deeply copied into the `ports` table. Updating a template does *not* retroactively alter existing devices.
- **Port Groups UI:** To keep the DB flat, "Port Groups" don't have their own table. Instead, `PortDef` and `Port` records store `groupName` and `groupLayout` strings. The `DeviceCard` component groups them into contiguous UI blocks on-the-fly.
- **Endpoints vs Rack Devices:** Devices with endpoint categories (`wifi_ap`, `ip_camera`, `wall_panel`) are logically assigned to a Rack but are rendered separately in an `<EndpointsTable>`. They bypass standard U-slot mounting logic and are deliberately filtered out of the visual `RackGrid` elevation.
- **Focus Loss Bugs:** When building inline-edit inputs (e.g., changing a device's `U:` position on a card), always use a local React state buffer and only trigger the API update `onBlur` or `onKeyDown('Enter')`. Otherwise, the parent component re-fetches and unmounts your input mid-keystroke.
- **Right Panel Layout (RackView):** Three display states controlled by `rightPanelOpen` + `panelExpanded` booleans. Collapsed = 28px strip; normal = 360px compact; expanded = 680px absolute overlay (`z-index: 20`). The expand strip is a full-height 20px button, a sibling of (not a child of) the tab bar.
- **Split View Auto-Collapse:** When `isSplitActive` (`isManualSplitView || !!crossSiteTargetRackId`) becomes true, both the right panel (`setRightPanelOpen(false)`) and the sidebar (`setCollapsed(true)`) auto-collapse. This is intentional to maximise horizontal space. Do NOT remove these `useEffect` hooks.
- **Cable Tracing (TracePanel):** `client/src/components/RackView/TracePanel.tsx` implements a **bidirectional** walk. It calls `walkDirection(originPortId, originSlot)` for the forward path AND `walkDirection(originPortId, passthroughSlot(originSlot))` for the backward path, then reverses+flips the backward hops and concatenates `[...backwardHops, ...forwardHops]`. This ensures the full chain is always shown regardless of where in the chain the trace is triggered. Do NOT simplify this to a single forward walk — doing so breaks mid-chain tracing (e.g., tracing from a patch panel port only shows one half of the chain).
  - Patch panels are automatically passthrough: arriving on `front` exits on `back` and vice versa.
  - Cross-rack payloads are lazy-fetched via `api.racks.view(rackId)` and cached in a `Map<string, RackViewPayload>`.
  - Entry points: port hover popup `↯ Trace` button; `↯` button in Connections and Endpoints table rows.
- **DeviceCard Port Button Rules:**
  - Port `<button>` elements must NOT have a `title=` attribute. The native OS tooltip competes with the styled portal popup.
  - The hover popup uses a 120ms debounce via `useRef<ReturnType<typeof setTimeout>>` (`scheduleHide`/`cancelHide`). Do NOT simplify to direct `setHoverBox(null)` on `onMouseLeave` — this makes the Trace button in the popup unreachable.
  - Smart slot detection: `clickSlot = (!front && back) ? 'back' : 'front'`. Do not hardcode `slot: 'front'`.
- **Connections Table Ordering:** Sorted by two levels: (1) category priority descending — `patch_panel: 100, switch: 80, firewall: 70, router: 60, server: 50, wifi_ap: 40, ip_camera: 30, wall_panel: 20` — reflecting real-world cable tracing intuition where patch panels are the aggregation point; (2) tiebreak by device name then port label using `localeCompare(x, undefined, { numeric: true })` so "Port 2" sorts before "Port 10". Direction is normalised so the local rack's device is always Endpoint A.

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
