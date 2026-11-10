# Changelog

All notable changes to Scope are documented here. Versions follow semantic versioning.

## Unreleased

## 1.1.0 - 2026-11-10

- Added an administrator-only Service Inbox directly to the Services workspace for reviewing discovered routes.
- Added compact provider health, last-check time, resource counts and readable errors to the Service Inbox.
- Added reversible accepted and rejected discovery decisions plus review and fully merged YAML exports while keeping Git-managed inventory authoritative.
- Added an optional, provider-neutral reverse-proxy adapter contract with Traefik, Caddy and Nginx Proxy Manager drivers; Scope does not require any reverse proxy.
- Added guided, read-only DNS, TCP, TLS, HTTP, Docker, SSH and RDP troubleshooting with clear failed steps and suggested next actions.
- Added configurable service health paths, methods, expected HTTP statuses, redirect handling, timeouts and measured response times.
- Tightened the editor schema for existing notification rules, channel definitions and maintenance windows.
- Preserved existing YAML comments when exporting a merged discovery inventory.
- Kept discovered Docker observations out of the user-facing onboarding workflow; the Service Inbox is intentionally limited to addable services.
- Added explicit targets for existing panels, new panels, and entirely new areas to the Service Inbox.
- Reused accepted, not-yet-deployed areas and panels as draft destinations for later proposals.
- Added compact, provider-grouped proposals that reveal metadata and destination controls only when a service is being added.
- Added one-click copy and download actions for the fully merged inventory while keeping the mounted YAML read-only.
- Added direct editing for accepted Discovery services without requiring rejection and re-acceptance.
- Added provider-neutral dependency inheritance so discovered services can automatically receive server-based `depends-on` relationships.
- Kept the Service Inbox to one internal scroll region and promoted the Git-managed inventory notice to a visible callout.
- Removed the nested scrollbar from the personal settings dialog.
- Consolidated personal settings and sign-out actions in a compact profile menu while keeping Administration separate in the sidebar.
- Fixed misleading SSH, RDP, Docker, TLS and DNS indicators by isolating nested status states and hardening fragmented remote handshakes.

## 1.0.0 - 2026-10-17

- Stable YAML inventory v1 with editor schema, defaults, groups, categories and validation.
- Service overview, Docker host monitoring, SSH/RDP sessions, TLS/DNS checks and Scope overview.
- Viewer, operator and administrator accounts, responsive personal panel/card layouts, favorites, themes, languages and administrator management.
- PostgreSQL status history, versioned database migrations, audit events and admin recovery.
- Durable SMTP/Discord notification outbox with retry, delivery history, maintenance windows and dependency-aware suppression.
- Prometheus metrics, split liveness/readiness probes, hardened browser security and multi-architecture container builds.
- Scope Community is released under `AGPL-3.0-or-later`.
