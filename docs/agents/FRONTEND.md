# RANT — Frontend Agent Guide

> **When to read this:** Any time you are modifying a React component, page, layout, context, or the API client. Read [`docs/UI-UX-GUIDE.md`](../UI-UX-GUIDE.md) alongside this for the colour palette and visual design system.

---

## Component Map

```
client/src/
├── api/client.ts              ← Typed fetch wrappers — all API calls go here
├── auth/
│   ├── AuthContext.tsx        ← Session state (user, login, logout)
│   └── ProtectedRoute.tsx     ← Route guard
├── contexts/
│   └── PatchingContext.tsx    ← Global patching/split-view state (see below)
├── components/
│   ├── Layout.tsx             ← Shell: sidebar + <Outlet>
│   ├── Dashboard.tsx          ← Home page stats
│   ├── TopologyView.tsx       ← Mermaid diagram + table (reused by Site & Profile pages)
│   ├── Sidebar/
│   │   ├── Sidebar.tsx        ← Collapsible nav rail
│   │   └── RackTree.tsx       ← Site → Rack tree
│   └── RackView/
│       ├── RackView.tsx       ← Main rack shell (toolbar, patching banner, right panel)
│       ├── RackGrid.tsx       ← CSS Grid rack elevation
│       ├── DeviceCard.tsx     ← Individual device + port buttons
│       ├── ConnectionsTable.tsx
│       ├── EndpointsTable.tsx
│       ├── TracePanel.tsx     ← Bidirectional cable trace
│       └── DeviceEditorModal.tsx
└── pages/
    ├── RackViewPage.tsx       ← Loads primary + split-view rack data
    ├── SiteViewPage.tsx
    ├── ProfileViewPage.tsx    ← Global topology
    ├── TemplatesPage.tsx
    ├── AdminPage.tsx
    └── LoginPage.tsx          ← Morphs into setup screen when zero users exist
```

---

## PatchingContext — Global State

[`client/src/contexts/PatchingContext.tsx`](../../client/src/contexts/PatchingContext.tsx) is the single source of truth for the patching and split-view workflow. Always read and mutate state through `usePatching()`.

| Field | Purpose |
|---|---|
| `selectedPort` | The first port clicked (patching source). `isPatching = !!selectedPort`. |
| `crossSiteTargetRackId` | ID of the rack shown in the right pane of split view. |
| `isManualSplitView` | True when split view is opened programmatically (from Trace panel or topology). |
| `highlightedLinkId` / `pinnedLinkId` | Cable highlight state. `highlightedLinkId` resolves to `pinnedLinkId` first if set. |

**Triggering Split View programmatically** (from topology map, trace panel, etc.):
```ts
setIsManualSplitView(true)
setCrossSiteTargetRackId(targetRackId)
navigate(`/racks/${primaryRackId}`)
```
`RackViewPage` reacts automatically — do NOT manipulate DOM, hack `key` props, or try to force re-mounts.

---

## RackView Layout States

Three right-panel states controlled by two booleans in `RackView.tsx`:

| State | `rightPanelOpen` | `panelExpanded` | Width / behaviour |
|---|---|---|---|
| Collapsed | `false` | — | 20px vertical strip, click to expand |
| Normal | `true` | `false` | 360px, compact 2-column table mode |
| Expanded | `true` | `true` | 680px, `position: absolute; z-index: 20`, floats over rack grid |

**Split View Auto-Collapse:** When `isSplitActive` (`isManualSplitView || !!crossSiteTargetRackId`) becomes `true`, both the right panel (`setRightPanelOpen(false)`) and the sidebar (`setCollapsed(true)`) auto-collapse. This is intentional — do NOT remove these `useEffect` hooks.

---

## RackGrid & Device Placement

- Devices are placed by `positionU` (1-indexed, top of rack = 1). They occupy `[positionU, positionU + uHeight - 1]`.
- Collision detection is **frontend-only** in `RackView.tsx` (`handleUpdateDevicePosition`, `handleInstantiateDevice`). The backend does NOT enforce it.
- Out-of-bounds or overlapping devices are rendered in an `unplacedDevices` bucket in `RackGrid.tsx`. Handle them gracefully — do NOT force rigid pixel heights on `DeviceCard` wrappers.
- Endpoint categories (`wifi_ap`, `ip_camera`, `wall_panel`) are filtered OUT of the rack grid and rendered only in `<EndpointsTable>`.

---

## DeviceCard Port Button Rules

These rules exist because of specific, hard-won bugs. Do not deviate.

1. **No `title=` on port `<button>` elements.** The native OS tooltip competes with the styled portal popup and must be suppressed.
2. **120ms debounce on hover popup.** The popup uses `useRef<ReturnType<typeof setTimeout>>` (`scheduleHide` / `cancelHide`). Do NOT simplify to `setHoverBox(null)` on `onMouseLeave` — doing so makes the `↯ Trace` button in the popup unreachable because the mouse must leave the port button to reach it.
3. **Smart slot detection:** `clickSlot = (!front && back) ? 'back' : 'front'`. Do not hardcode `slot: 'front'`.

---

## Cable Tracing (TracePanel)

[`TracePanel.tsx`](../../client/src/components/RackView/TracePanel.tsx) implements a **bidirectional** walk:

```
walkDirection(originPortId, originSlot)          → forward hops
walkDirection(originPortId, passthroughSlot(originSlot))  → backward hops
result = [...backwardHops.reverse(), ...forwardHops]
```

This ensures the full chain is shown regardless of where in the chain tracing is triggered. **Do NOT simplify to a single forward walk** — it breaks mid-chain tracing (e.g. tracing from a patch panel port shows only half the chain).

- Patch panels auto-passthrough: arriving on `front` exits on `back` and vice versa.
- Cross-rack payloads are lazy-fetched via `api.racks.view(rackId)` and cached in a `Map<string, RackViewPayload>`.
- Entry points: port hover popup `↯ Trace` button; `↯` button in Connections and Endpoints table rows.

---

## Connections Table Ordering

Two-level sort applied in `ConnectionsTable.tsx`:

1. **Category priority (descending):** `patch_panel: 100 → switch: 80 → firewall: 70 → router: 60 → server: 50 → wifi_ap: 40 → ip_camera: 30 → wall_panel: 20`
2. **Tiebreak:** device name, then port label — both with `localeCompare(x, undefined, { numeric: true })` so "Port 2" sorts before "Port 10".

Direction is normalised so the local rack's device is always Endpoint A.

---

## Topology Views (Mermaid)

- Topology diagrams use **Mermaid.js strings generated server-side** and rendered statically on the client. Do not use Mermaid's native click bindings.
- Use CSS (`svg .node { cursor: pointer }`) and a React `onClick` on the SVG container. Use `e.target.closest('.node')` to intercept node clicks.
- **React Strict Mode bug:** When calling `mermaid.render()` inside a `useEffect`, generate a **mathematically unique ID** for every render pass. Re-using the same ID crashes Mermaid's internal cache during double-mount.
- **Deep-routing to split view:** Clicking a cable row in a topology data table must call `setIsManualSplitView(true)` + `setCrossSiteTargetRackId(...)` then navigate — not manipulate the DOM.

---

## Inline Edit / Focus Loss Pattern

When building inline-edit inputs (e.g. changing a device's U position on a card):
- Use a **local React state buffer** for the input value.
- Only trigger the API update `onBlur` or `onKeyDown('Enter')`.
- If you trigger a reload on every keystroke, the parent re-fetches and unmounts the input mid-type.

---

## Device Templates (Blueprint vs Instance)

- Templates are blueprints only. When instantiated, ports are **deeply copied** into the `ports` table.
- Updating a template does **not** retroactively change existing devices.
- Port Groups have no dedicated DB table — `PortDef` and `Port` records store `groupName` + `groupLayout` strings. `DeviceCard` groups them into contiguous UI blocks on-the-fly.
