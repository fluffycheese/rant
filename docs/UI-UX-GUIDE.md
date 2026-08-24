# RANT Design & UI/UX Guide

> **Notice to AI Agents:** You MUST read and adhere to this guide before modifying any React components, CSS, or UI layouts.

RANT (Rack And Networking Tool) is designed to be a fast, frictionless, zero-setup tool for mapping network racks. The UI strictly favors practicality, low-overhead interactions, and dense information display over flashy graphics.

## 1. Core Philosophy
- **Frictionless Patching:** Wiring up a rack should feel as fast as doing it in the real world. Avoid multi-step wizards for common tasks.
- **No Heavy Graph Libraries:** Racks and devices are rendered as standard HTML/CSS Grids. We explicitly avoid node-graph libraries (like React Flow or d3). Connections are represented via matching colors, tabular data, and smart split-pane views.
- **Progressive Disclosure:** Keep the default UI clean. Advanced options (like changing cable types or cross-site patching) should be accessible but never block the primary "happy path" workflow.

## 2. Color Palette (Theme)
RANT utilizes a deep, high-contrast dark mode (heavily inspired by GitHub Dark Dimmed / standard dark themes) to reduce eye strain when looking at dense tables of switch ports. 

**DO NOT introduce new color variables outside this palette without a strong functional reason.**

### Backgrounds & Surfaces
- **App Background:** `#0f1117`
- **Panels & Headers:** `#161b22` (Used for sidebars, toolbars, and modal backgrounds)
- **Deep Interior:** `#090d13` (Used for the dark internal cavity of the Rack cabinet)
- **Elevated Elements:** `#0d1117` (Used for inputs, badges, and the bottom rack rail)

### Borders & Dividers
- **Standard Borders:** `#30363d` (Used around panels, tables, and cabinets)
- **Subtle Dividers:** `#21262d` (Used for faint lines, like empty U-slot markers)

### Typography
- **Primary Text:** `#e2e8f0` (Main headings, rack names, active values)
- **Secondary Text:** `#c9d1d9` (Table data, standard body text)
- **Muted Text / Labels:** `#8b949e` (Small headers, placeholders, secondary breadcrumbs)
- **Faint / Disabled Text:** `#6e7681` (Slashes, very subtle contextual hints)

### Accents & Actions
- **Primary Action (Blue):** `#58a6ff` (Active tabs, highlight rings, patching banners)
- **Success / Add (Green):** `#238636` (Primary "Add Device" or "Add Link" buttons)
- **Destructive / Error (Red):** `#ff7b72` (Error text, delete actions)

### Port Connections (Cable Defaults)
- **Front Connections:** Green family (`#238636` to `#7ee787`)
- **Back Connections:** Purple family (`#a371f7` to `#d2a8ff`)

## 3. Layout & Navigation Patterns
We utilize a dual-pane system to allow users to compare and patch hardware without losing their contextual anchor.

- **Rack Elevation:** A single-pane view focusing entirely on the physical layout of one rack.
- **Hybrid View:** The default view. Shows the physical Rack on the left, and a searchable Connections Table on the right. Below 1200px width, the table stacks smoothly under the rack using standard `@media` queries.
- **Split View (Side-by-Side):** Used for cross-rack or cross-site patching and comparison.
  - **Interaction Rule:** When the Split View tab is active, clicking a rack in the sidebar intercepts the browser navigation. Instead of leaving the page, it loads the clicked rack into the right-hand pane for comparison.
  - **The "Make Primary" Pivot:** To prevent complex routing state, the left pane is ALWAYS tied to the current browser URL (`/racks/:id`). To swap your focus, users click a "⬅️ Make Primary" button on the right-hand rack, which navigates the browser to that rack, moving it to the left pane.

## 4. Interaction Paradigms
- **Empty Ports (Action First):** Clicking an empty port immediately drops the user into Link Mode. It assumes you want to patch a cable. 
- **Connected Ports (Details First):** Clicking a partially or fully connected port opens the `PortDetailsModal`. This allows users to view what is plugged in, disconnect cables, or edit metadata.
- **Editing Cables:** Users can edit cable metadata (Color, Label, Cable Type), but they **cannot** edit a cable's Port endpoints. If a cable is plugged into the wrong port, physical logic applies: delete the connection and patch a new one.

## 5. Terminology strictly enforced in the UI
- **Link Slots:** Ports use `Front` and `Back` terminology (never primary/secondary).
- **Cross-Site Context:** If a connection leaves the current rack, the UI must display its full destination path: `[Site Name] / [Rack Name] / [Device Name]`.

## 6. Topology & Visualization
To provide macro-level overviews without introducing heavy interactive canvas plugins, RANT uses a specific **Diagram Top, Table Bottom** pattern for topology pages.

- **Profile Topology (Macro):** Displays Site-to-Site connections. Individual racks are not drawn to prevent "spiderwebbing".
- **Site Topology (Micro):** Displays Rack-to-Rack connections within a specific site. Links leaving the site terminate at a generic `Site: [Name]` node.
- **Interactive SVG Event Delegation:** Mermaid.js diagrams are rendered statically. We do not use Mermaid's native click bindings. Instead, we use CSS (`svg .node { cursor: pointer; }`) and attach a standard React `onClick` to the SVG container. We use `e.target.closest('.node')` to intercept clicks on nodes (like Racks or Sites) to dynamically filter the Data Table below.
- **Mermaid React Strict-Mode Bug:** When calling `mermaid.render()` inside a `useEffect`, you MUST generate a mathematically unique ID (e.g., `mermaid-graph-` + random string) for every render pass. Re-using the same ID causes internal Mermaid cache crashes during React Strict Mode's double-mount cycle, resulting in vanishing diagrams.
- **Deep-Routing to Split View:** Clicking any cable row in a Topology data table instantly routes the user into the manual Split View (`/racks/:sourceId`), setting the destination rack in the `PatchingContext` so they can immediately inspect the physical ports of both ends.
