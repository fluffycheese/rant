# ADR 0003: Inline CSSProperties for All Frontend Styling

**Date:** 2026-09-01  
**Status:** Accepted

## Context

RANT's frontend is a React 18 + Vite application deployed to two different runtimes: Node.js (Docker/Nix via `entry.node.ts`) and Cloudflare Workers (via `entry.cloudflare.ts`). Both environments serve the same pre-built static bundle.

When building the frontend, we needed to choose a styling approach. The main candidates were:
- **CSS Modules** — scoped per-file, requires PostCSS build step
- **Tailwind CSS** — utility classes, requires PostCSS and JIT compiler
- **Styled-components / Emotion** — CSS-in-JS with runtime overhead and SSR complexity
- **Inline `CSSProperties` objects** — zero-dependency, zero-build-step, zero-runtime

## Decision

All frontend styling in RANT uses React inline `style` props with typed `CSSProperties` objects. There are no `.css` files, no CSS modules, no Tailwind classes, and no CSS-in-JS libraries.

The only exception is the global scrollbar stylesheet injected as a `<style>` block in `client/index.html` — this cannot be done with inline styles as it targets pseudo-elements (`::-webkit-scrollbar`).

## Reasoning

1. **Zero build-step dependency:** No PostCSS, no Tailwind config, no purging configuration. The Vite build stays simple.
2. **Colocation:** Styles live directly next to the JSX that uses them, typically in a `const s: Record<string, CSSProperties> = { ... }` block at the top of each component. This makes components fully self-contained.
3. **TypeScript safety:** `CSSProperties` gives full type-checking on every style property. Typos are caught at compile time.
4. **Cloudflare compatibility:** Cloudflare Workers has no filesystem at runtime. While the bundle is pre-built, avoiding CSS processing pipelines reduces the risk of build-time surprises with the Cloudflare Pages adapter.
5. **Dense component rewrite safety:** When a subagent rewrites a component, all styles travel with the component — there is no risk of leaving orphaned CSS rules or missing class names.

## Consequences

- **Verbose components:** Style objects can be long. This is acceptable — clarity over cleverness.
- **No CSS pseudo-classes via inline styles:** `:hover`, `:focus`, etc. must be handled with React state (e.g., `useState` for hover) or via the global stylesheet in `index.html`.
- **Animations:** CSS keyframe animations are not possible with inline styles. Any animation must use the global style block in `index.html` or JavaScript-driven transitions.
- **Consistency risk:** Without a design token system, colours and spacing can drift. Mitigated by the canonical palette table in `docs/UI-UX-GUIDE.md` — all agents must read this before modifying UI.
