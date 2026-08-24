# RANT — Rack And Networking Tool

> Domain model. No implementation details. Last updated: 2026-08-19.

## Glossary

**Site**
A physical location (e.g., a building, floor, or data centre) that contains one or more Comms Racks. A Site is the top-level organisational unit.

**Comms Rack**
A physical equipment rack at a Site. Contains Devices. A rack belongs to exactly one Site.

**Device**
A piece of physical network equipment installed in a Comms Rack — e.g., a Switch, Patch Panel, Router, Wall Port panel, or Server. A Device has one or more Ports. A Device occupies a specific vertical position (`positionU`) and height (`uHeight`) within the Rack. Overlapping devices are strictly prohibited. Devices are instantiated from Device Templates, but once mounted, their properties and ports can be edited completely independently of the master template.

**Port**
A physical connection point on a Device. A Port has two named link slots: `front` and `back`. Most ports (switch ports, wall sockets) use only the `front` slot. Patch panel ports can use both — `front` typically faces the active equipment (e.g., a switch) or patch leads, `back` faces the passive side (e.g., a wall socket) or structural cabling. A Port may carry at most one Cable Link per slot.

**Port Group**
A physical grouping of Ports on a Device's front panel (e.g., "Access", "Uplinks"). Each group defines its own layout (e.g., single or double row) to accurately reflect the hardware. Simple devices implicitly have exactly one Port Group.

**Cable Link**
A physical connection between a specific slot on Port A and a specific slot on Port B. A Cable Link may cross Device, Rack, or Site boundaries (e.g., a fibre trunk between Rack A at Site 1 and Rack B at Site 2). Inter-site Cable Links are a first-class concept, not an afterthought. The DB enforces at most one Cable Link per (Port, slot) pair.

**Data Store**
A server-side persistence layer that holds all Sites, Racks, Devices, Ports, and Cable Links for a Profile. Backed by SQLite (via Drizzle ORM + better-sqlite3) in the initial deployment. The repository interface is DB-agnostic so Postgres can be substituted later without changing application logic.

**User**
A member of a small trusted team. All Users have identical access to all Profiles, Sites, and Racks within the instance. The application enforces no per-user permissions.

**Authentication Boundary**
RANT supports two authentication modes. By default, it provides a built-in session-based login system (users stored in the Data Store). For enterprise deployments, a proxy-auth mode can be enabled via environment variable, where RANT disables its internal login and trusts an upstream reverse proxy (e.g., Traefik + Keycloak).

**Profile**
A named workspace containing one or more Sites and all their associated Racks, Devices, Ports, and Cable Links. Allows a user to manage completely separate network environments (e.g., different customer networks).

**Device Template**
An optional, reusable definition of a Device type — specifying its name, category, and Port layout (including custom labels and port groups). Templates act as **blueprints**. When a user instantiates a template to mount a Device in a Rack, the port definitions are deeply copied into the Data Store. Subsequent changes to a template do *not* automatically cascade to previously created devices. Templates are shared globally across all Profiles.

**Platform Adapter**
A thin entry-point module that bridges the shared application code to a specific deployment target (Docker/Nix via Node.js, or Cloudflare Pages via Workers). Each adapter injects the database connection and runtime configuration into the Hono request context before any shared middleware or route handlers execute.
_Avoid_: Driver, plugin

**Entry Point**
The platform-specific module that bootstraps the application. For Node.js targets (`entry.node.ts`): creates the database, runs migrations, injects config, serves static files, and starts the HTTP listener. For Cloudflare (`entry.cloudflare.ts`): injects the D1 binding and exports the Hono app as a Pages Function.
_Avoid_: Main, index, server

**Setup Route**
A one-time API endpoint (`/api/auth/setup`) that creates the first admin user. Only available when zero users exist in the Data Store. In the UI, the standard `/login` route automatically detects this state and morphs into a setup screen. Replaces the previous CLI-based admin creation script.

