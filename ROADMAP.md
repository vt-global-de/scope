# Scope roadmap

Scope develops in two deliberate product generations:

- **Scope 1.x — see and reach.** Describe infrastructure, observe its current state, open the right target and notify people reliably.
- **Scope 2.x — understand and respond.** Model how infrastructure is connected, correlate failures into incidents and guide an operator through diagnosis.

The YAML inventory remains the authoritative, reviewable source of intent throughout that evolution. This roadmap describes direction and sequence, not release dates. Technical findings, maintenance cost and evidence from real deployments may change individual items or their priority. A capability is available only after it appears in a released changelog.

## 1.0 — Operational foundation · Shipped

Goal: provide a dependable, self-hosted overview and access layer for small infrastructure environments.

- Stable YAML inventory v1 with validation, defaults, groups and categories.
- Service availability with integrated DNS and certificate checks.
- Docker host monitoring over sockets, TCP and TLS.
- Browser-based SSH and RDP sessions with roles and audit events.
- PostgreSQL-backed status history, users, preferences and layouts.
- SMTP and Discord notifications, maintenance windows and Prometheus metrics.

## 1.1 — Discovery · Shipped

Goal: make Scope easier to adopt and troubleshoot without replacing configuration as code.

- Read-only discovery for Docker hosts and containers.
- Discover routes through an optional provider adapter for Traefik, Caddy or Nginx Proxy Manager.
- Keep the discovery contract provider-neutral so Scope remains useful without any reverse proxy.
- Compare discovered service routes with `inventory.yaml` without presenting Docker containers as editable inventory resources.
- Surface unmanaged service routes directly in the Services workspace.
- Review services as pending, accepted or rejected, revise decisions at any time, and export the result for Git-managed deployment.
- Improve connection troubleshooting for Docker, SSH, RDP, HTTP, DNS and TLS with readable steps and next actions.

## 1.2 — Secure reach · Next

Goal: collect useful operational signals across network zones without broadly exposing management APIs.

- Small Scope Agent with an outbound-only connection to the Scope server.
- Host, Docker and selected system-service signals.
- HTTP, TCP, DNS and network checks from multiple points of view.
- Least-privilege enrollment, rotation and revocation.
- Preserve direct socket and TLS connections for environments that do not need an agent.
- Evaluate secure remote-session transport without weakening network boundaries.

## 1.3 — Operational integrations · Planned

Goal: finish the v1 foundation around identity, delivery and observability before introducing the v2 incident model.

- OIDC and LDAP integration with a documented external-authentication model.
- Stronger multi-factor authentication options for local accounts.
- Generic webhook notification channels and clearer delivery policies.
- Route notification rules by target type, group and tags, with explicit severity levels.
- Add cooldowns, escalation intervals, configurable recovery behavior and daily or weekly digests.
- Support reusable message templates, manual retry of failed deliveries and recurring maintenance windows.
- Official Grafana dashboard for Scope's Prometheus metrics.
- Backup, restore and upgrade diagnostics surfaced in the application.
- Continue hardening accessibility, mobile layouts and remote-session ergonomics.

## 2.0 — Infrastructure intelligence · Direction

Goal: turn isolated target states into an explainable model of cause, impact and response.

Version 2.0 is not simply a larger dashboard. It introduces two connected operational workspaces and a richer infrastructure model.

### Topology workspace

A new **Topology** menu presents an interactive infrastructure graph rather than a static mind map.

- Model typed nodes such as services, hosts, containers, reverse proxies, DNS, databases, storage, networks and external dependencies.
- Model typed relationships such as `hosted-on`, `depends-on`, `routes-through`, `resolves-via` and `stores-on`.
- Combine declared inventory relationships with provider-neutral Docker and reverse-proxy evidence while showing where each fact came from.
- Focus on one target and trace upstream dependencies or downstream consumers.
- Filter by group, category, tag, state and relationship type so larger installations remain readable.
- Overlay live state and recent changes without making the graph itself another configuration source.

### Incident workspace

A new **Incidents** menu groups related failures into an operational case instead of treating every failed check as an independent outage.

- Correlate status transitions using topology, timing and shared dependencies.
- Present the probable root cause separately from affected symptoms and always show the supporting evidence.
- Calculate the visible blast radius across services, servers and groups.
- Build a unified timeline from checks, status history, notifications, maintenance windows and operator actions.
- Link Markdown runbooks to targets and dependency types.
- Offer ordered next checks and troubleshooting paths based on observed evidence and user-defined runbooks.
- Open the relevant Scope remote session or contextual Grafana, Loki, Prometheus and management links from the incident.
- Allow acknowledgement, assignment notes and resolution summaries without trying to become a full ticketing platform.

### Dependency and incident engine

- Evolve the current service-to-server `depends-on` field into typed, validated relationships.
- Distinguish raw **events**, correlated **incidents** and delivered **notifications**.
- Suppress symptom notifications when a known upstream dependency already explains the outage.
- Recalculate incidents when topology or live evidence changes and retain the reasoning in PostgreSQL.
- Prefer deterministic rules and explicit runbooks for 2.0. Suggested actions must be explainable and must never be presented as a guaranteed fix.
- Keep remediation read-first: Scope guides and connects; it does not silently restart or reconfigure infrastructure.

### Definition of the 2.0 boundary

Scope 2.0 is ready only when an operator can move through one coherent workflow:

1. See that something important is unavailable.
2. Open one incident instead of several duplicate alerts.
3. Understand the likely upstream cause and affected targets.
4. Follow an evidence-backed diagnostic path or linked runbook.
5. Reach the relevant system and record how the incident was resolved.

The richer relationship model may require **inventory schema version 2**. Any migration must be documented, validated and accompanied by a conversion path from inventory v1.

## After 2.0, based on evidence

- Guided and permission-controlled remediation actions.
- Docker Swarm and Kubernetes topology sources.
- Additional incident providers and external ticketing integrations.
- A supported extension model for infrastructure sources, relationship types and diagnostic providers.
- Team and governance capabilities only after real community demand is understood.

## Product guardrails

- **Inventory stays authoritative.** Discovery proposes and annotates; it does not silently rewrite intent.
- **Evidence before certainty.** Scope may show a probable cause, but it must expose why it reached that conclusion.
- **Read-first operations.** Scope explains and connects before it attempts to change infrastructure.
- **Context over feature count.** New work should clarify relationships or reduce incident effort.
- **Self-hosting remains complete.** Core infrastructure visibility and incident context must not depend on an external service.
- **Roadmap is not availability.** Planned and directional work is never marketed as shipped.

GitHub issues and discussions are used to validate problems and reprioritize this roadmap. Concrete use cases are more valuable than feature-count voting.
