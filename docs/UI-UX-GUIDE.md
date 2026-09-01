# RANT Design & UI/UX Guide

> **Notice to AI Agents:** You MUST read and adhere to this guide before modifying any React components, CSS, or UI layouts.

RANT (Rack And Networking Tool) is designed to be a fast, frictionless, zero-setup tool for mapping network racks. The UI strictly favors practicality, low-overhead interactions, and dense information display over flashy graphics.

## 1. Core Philosophy
- **Frictionless Patching:** Wiring up a rack should feel as fast as doing it in the real world. Avoid multi-step wizards for common tasks.
- **No Heavy Graph Libraries:** Racks and devices are rendered as standard HTML/CSS Grids. We explicitly avoid node-graph libraries (like React Flow or d3). Connections are represented via matching colors, tabular data, and smart split-pane views.
- **Progressive Disclosure:** Keep the default UI clean. Advanced options (like changing cable types or cross-site patching) should be accessible but never block the primary "happy path" workflow.
- **Inline styles only:** All styling is via React inline `CSSProperties` objects. There are no `.css` files, CSS modules, or utility class libraries (no Tailwind). Do not introduce external style mechanisms.

## 2. Color Palette (Theme)
RANT uses a deep Slate dark theme. All colours come from the Slate/Sky family below.

**DO NOT introduce new color values outside this palette without a strong functional reason.**

### Backgrounds & Surfaces
- **App Background:** `#0F172A` (deepest background, body, rack cavity interior)
- **Panels & Surfaces:** `#1E293B` (sidebars, toolbars, modal backgrounds, device cards)
- **Logo / Header Strip:** `#64748B` (sidebar header background, login card background)

### Borders & Dividers
- **Standard Borders:** `#334155`
- **Subtle Dividers:** `#1E293B` (same as surface, used for faint inset lines)

### Typography
- **Primary Text:** `#F1F5F9`
- **Secondary Text:** `#CBD5E1`
- **Muted Text / Labels:** `#64748B`
- **Faint / Disabled Text:** `#475569`

### Accents & Actions
- **Primary Action (Blue):** `#3BB2F6`
- **Active Ring / Glow:** `#0EA5E9`
- **Success / Add (Green):** `#10B981`
- **Destructive / Error (Red):** `#F87171`
- **Cross-site / Trace accent (Purple):** `#A78BFA`

### Port Connections (Cable Defaults)
- **Front Connections:** Green family (`#10B981` to `#34D399`)
- **Back Connections:** Purple family (`#A78BFA` to `#C4B5FD`)

## 3. Layout & Navigation

### Sidebar
- **Collapsed (rail):** 56px wide. Shows site initials as icon badges. Header strip is `#64748B`.
- **Expanded:** 260px wide. Shows `primary-stacked.png` logo at 140px height, centred, on `#64748B` header. Collapse button (`‹`) is positioned absolute top-right.
- **Auto-collapse rule:** When split view activates (`isManualSplitView = true`), the sidebar automatically collapses to rail mode to maximise horizontal space. Do NOT remove this behaviour.

### Rack View Layout
The Rack View uses a **permanent two-column layout** — there is no view-mode selector or dropdown.

- **Left column:** Rack grid (`RackGrid`). Always visible.
- **Right panel:** Three display states controlled by two boolean flags:
  - `rightPanelOpen = false` → 28px slim strip with "‹ Connections" vertical text. Click to expand.
  - `rightPanelOpen = true, panelExpanded = false` → 360px normal panel. Compact 2-column table mode.
  - `rightPanelOpen = true, panelExpanded = true` → 680px overlay, `position: absolute; z-index: 20`, floats over the rack grid. Full table mode with all columns visible.
- **Auto-collapse rule:** When split view activates, the right panel also auto-collapses (`rightPanelOpen = false`). Do NOT remove this behaviour.

### Right Panel Tabs
The right panel has three tabs:
1. **Connections** — searchable cable links table
2. **Endpoints** — endpoint devices (wifi_ap, ip_camera, wall_panel)
3. **↯ Trace** — cable trace panel. Only appears when a trace is active.

### Split View
Split view is triggered by:
- Cross-site patching (clicking a port, then navigating to another rack)
- The `⇄ Split view` button in the Trace panel for cross-site hops
- Manual activation via `PatchingContext.setIsManualSplitView(true)`

When split view activates: sidebar collapses to rail, right panel collapses. This is intentional — not a bug.

## 4. Interaction Paradigms

### Port Buttons (DeviceCard)
- **IMPORTANT:** Port `<button>` elements must NOT have a `title=` attribute. The native OS tooltip competes with the styled portal popup and must be suppressed.
- **Hover popup:** The portal popup uses a 120ms debounce (`scheduleHide`/`cancelHide` via `useRef<ReturnType<typeof setTimeout>>`). Do NOT simplify this to a direct `setHoverBox(null)` on `onMouseLeave` — doing so makes the Trace button unreachable.
- **Slot detection:** Clicking a port uses smart slot detection: if the port only has a back connection (no front), `clickSlot = 'back'`. Otherwise defaults to `'front'`.

### Patching / Linking (🔗)
Managing connections directly from tables is done via the `🔗` button. Clicking it on an unconnected endpoint port drops you into patching mode. Clicking it on an existing link opens the Link Editor.

### Cable Tracing (↯)
- Entry points: hover a connected port → `↯ Trace` button in popup; or `↯` button on any row in Connections or Endpoints tables.
- The Trace tab (third tab in right panel) opens automatically.
- Clicking a hop card highlights the cable link in the rack grid.
- Cross-rack hops show a "→ Open rack" button; cross-site hops show "⇄ Split view".

### Editing Devices & Ports (✎)
Users can edit mounted device metadata (Name, Color, U-slot) and modify individual port labels and connector types via the `DeviceEditorModal`.

### Endpoints
Endpoint devices (`wifi_ap`, `ip_camera`, `wall_panel`) bypass U-slot mounting and appear only in the `EndpointsTable`. They use the same `🔗` and `↯` buttons.

## 5. Connections Table Ordering
The Connections table sorts by two levels:
1. **Category priority** (descending): `patch_panel: 100 → switch: 80 → firewall: 70 → router: 60 → server: 50 → wifi_ap: 40 → ip_camera: 30 → wall_panel: 20`
2. **Tiebreak:** device name then port label, both using `{ numeric: true }` natural sort so "Port 2" sorts before "Port 10".

Direction is normalised so the local rack's device is always shown as Endpoint A.

## 6. Terminology Strictly Enforced in the UI
- **Link Slots:** Ports use `Front` and `Back` terminology (never primary/secondary).
- **Cross-Site Context:** If a connection leaves the current rack, the UI must display its full destination path: `[Site Name] / [Rack Name] / [Device Name]`.

## 7. Topology & Visualization
To provide macro-level overviews without introducing heavy interactive canvas plugins, RANT uses a specific **Diagram Top, Table Bottom** pattern for topology pages.

- **Global Topology (Macro):** Displays Site-to-Site connections. Individual racks are not drawn to prevent "spiderwebbing".
- **Site Topology (Micro):** Displays Rack-to-Rack connections within a specific site. Links leaving the site terminate at a generic `Site: [Name]` node.
- **Interactive SVG Event Delegation:** Mermaid.js diagrams are rendered statically. We do not use Mermaid's native click bindings. Instead, we use CSS (`svg .node { cursor: pointer; }`) and attach a standard React `onClick` to the SVG container. We use `e.target.closest('.node')` to intercept clicks on nodes.
- **Mermaid React Strict-Mode Bug:** When calling `mermaid.render()` inside a `useEffect`, you MUST generate a mathematically unique ID for every render pass. Re-using the same ID causes internal Mermaid cache crashes during React Strict Mode's double-mount cycle.
- **Deep-Routing to Split View:** Clicking any cable row in a Topology data table instantly routes the user into the manual Split View, setting the destination rack in `PatchingContext`.
