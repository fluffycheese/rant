# RANT — Rack And Networking Tool

> Domain model. No implementation details. Last updated: 2026-08-25.

## Glossary

**Site**
A physical location (e.g., a building, floor, or data centre). A Site is the top-level organisational unit visible to users. It contains Comms Racks and can also directly host unmounted/site-level Devices (e.g., wall port panels, access points).

**Comms Rack**
A physical equipment rack at a Site. Contains Devices. A rack belongs to exactly one Site.

**Device**
A piece of physical network equipment installed in a Comms Rack or directly at a Site (e.g. wall ports, access points) — e.g., a Switch, Patch Panel, Router, Firewall, Wall Port panel, or Server. A Device has one or more Ports. When mounted in a Rack, a Device occupies a specific vertical position (`positionU`) and height (`uHeight`) within the Rack, and overlapping devices are strictly prohibited. Devices are instantiated from Device Templates, but once created, their properties and ports can be edited completely independently of the master template.

**Port**
A physical connection point on a Device. It has a label (e.g., "1", "Gi0/1", "MGMT") and a connector type (e.g., "rj45", "lc_fiber", "sfp+"). Ports are either standalone or visually grouped by `groupName` and `groupLayout` in the UI.

**Cable Link**
A logical representation of a patch cable connecting two Ports. A Cable Link has a type (e.g., "cat6", "fiber"), a colour, an optional label, and optional notes. Cable links can be internal to a Rack, cross-rack, or cross-site.

## Data Store
A server-side persistence layer that holds all Sites, Racks, Devices, Ports, Cable Links, Users, and Sessions. Backed by SQLite across all deployment targets (`better-sqlite3` on Docker/Nix, Cloudflare D1 on Pages Functions) via Drizzle ORM.

**User**
A member of a small trusted team. All Users have identical access to all Sites and Racks within the instance. The application enforces no per-user permissions.

**Authentication Boundary**
RANT supports two authentication modes. By default, it provides a built-in session-based login system (users stored in the Data Store). For enterprise deployments, a proxy-auth mode can be enabled via environment variable, where RANT disables its internal login and trusts an upstream reverse proxy (e.g., Traefik + Keycloak).

**Profile** *(internal)*
A default workspace that groups all Sites within an instance. Currently a single implicit Profile is created automatically. The concept is retained in the data model to support potential future multi-tenancy (e.g., per-customer isolation for MSPs) but is not exposed in the UI.

**Device Template**
An optional, reusable definition of a Device type — specifying its name, category, and Port layout (including custom labels and port groups). Templates act as **blueprints**. When a user instantiates a template to mount a Device in a Rack, the port definitions are deeply copied into the Data Store. Subsequent changes to a template do *not* automatically cascade to previously created devices. Templates are shared globally within the instance.

**Platform Adapter**
A thin entry-point module that bridges the shared application code to a specific deployment target (Docker/Nix via Node.js, or Cloudflare Pages via Workers). Each adapter injects the database connection and runtime configuration into the Hono request context before any shared middleware or route handlers execute.
_Avoid_: Driver, plugin

**Entry Point**
The platform-specific module that bootstraps the application. For Node.js targets (`entry.node.ts`): creates the database, runs migrations, injects config, serves static files, and starts the HTTP listener. For Cloudflare (`entry.cloudflare.ts`): injects the D1 binding and exports the Hono app as a Pages Function.
_Avoid_: Main, index, server

**Setup Route**
A one-time API endpoint (`/api/auth/setup`) that creates the first admin user. Only available when zero users exist in the Data Store. In the UI, the standard `/login` route automatically detects this state and morphs into a setup screen. Replaces the previous CLI-based admin creation script.

