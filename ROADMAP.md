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

## 1.1.1 — Stability and efficiency · Shipped

Goal: harden the 1.1 release for everyday use before the next feature milestone.

- Restore intentional smartphone and tablet layouts instead of scaling down the desktop dashboard.
- Keep page titles, navigation, profile actions, layout controls, dialogs and remote sessions usable within small viewports.
- Give smartphones a touch-friendly bottom navigation while retaining compact, recognizable navigation on tablets.
- Add informative Discord webhook content so push notifications identify Scope, the affected target and its state instead of reporting only an image attachment.
- Keep the existing descriptive email subject, text and HTML notification content unchanged and covered by delivery tests.
- Reduce DNS traffic with shared hostname resolution, bounded caching and single-flight lookups across concurrent checks.
- Separate cache intervals for service status, remote reachability, Docker monitoring, DNS records, TLS certificates and Discovery results.
- Pause browser polling while Scope is hidden and refresh stale data when the page becomes visible again.
- Run provider Discovery on demand instead of continuously polling infrastructure that is not currently being reviewed.

This patch keeps **inventory schema version 1**, requires no database migration and introduces no new mandatory configuration. Existing cache variables remain optional tuning controls; updated defaults favor lower background traffic.

## 1.2 — Secure reach · Next

Goal: optionally collect useful operational signals across network zones without broadly exposing management APIs.

- Add a small, optional Scope Agent with an outbound-only authenticated connection to the Scope server and no required inbound management port.
- Preserve the current agentless server checks, direct Docker socket and Docker TLS connections as fully supported operating modes.
- Allow direct and agent-assisted targets in the same installation so each network zone can use the simplest suitable connection model.
- Collect HTTP, TCP, DNS and TLS results from explicitly selected points of view.
- Collect optional host, Docker and selected system-service signals under capability-based least privilege.
- Enroll agents with a one-time credential, then support identity rotation, revocation, protocol-version negotiation and audit events.
- Distinguish an unavailable agent from an unavailable monitored target and buffer a bounded amount of data during short disconnects.
- Do not add arbitrary shell execution, automatic remediation or mandatory remote-session tunneling to the first agent release.

An agent is required only for checks or local signals that explicitly run through that agent. Standard dashboards, centralized checks, direct Docker monitoring, notifications and remote sessions remain usable without one.

## 1.3 — Identity and access · Planned

Goal: integrate Scope with established identity systems and make access policy clearer as installations grow.

- OIDC and LDAP integration with a documented external-authentication model.
- Stronger multi-factor authentication options for local accounts.
- More granular permissions for administration, remote access, Discovery, agents and notification operations.
- Session visibility, revocation and clearer login history.
- Map external groups to Scope roles without turning the external identity provider into a hard dependency for local recovery.
- Apply the same auditable authorization model to direct and agent-assisted operations.

## 1.4 — Alerting and operations · Planned

Goal: complete the operational v1 foundation before introducing the v2 incident model.

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

## 2.1 — Guided response · Direction

Goal: turn the 2.0 incident model into a repeatable operator workflow without hiding decisions or changing infrastructure automatically.

- Acknowledge incidents and record ownership, notes and resolution summaries.
- Store versionable Markdown runbooks and associate them with targets, relationships and incident patterns.
- Present ordered, read-only diagnostic steps with captured evidence and explicit completion state.
- Link directly to the relevant Scope remote session, logs, metrics and management interface.
- Retain a coherent investigation timeline without attempting to replace a full ticketing platform.

## 2.2 — Infrastructure sources · Direction

Goal: expand the topology and incident model through a supported, provider-neutral source contract.

- Add Docker Swarm and Kubernetes as optional topology and event sources.
- Integrate selected monitoring, storage and network sources without making any single vendor mandatory.
- Define a supported extension model for source capabilities, relationship types, health evidence and diagnostics.
- Display provenance and freshness for every discovered fact so declared intent and observed evidence remain distinguishable.
- Add external ticketing and incident-provider integrations only where they complement Scope's own workflow.

## 2.3 — Controlled remediation · Exploration

Goal: evaluate narrowly scoped operator-approved actions after Scope can already explain cause, impact and evidence reliably.

- Permit only explicitly configured actions with clear target, permission and impact boundaries.
- Require confirmation and optionally approval before an action changes infrastructure.
- Show the intended action, expected impact and rollback guidance before execution.
- Record requester, approver, result and emitted evidence in the audit and incident timelines.
- Start with constrained actions such as restarting an explicitly allowed container or service; never expose arbitrary shell execution.
- Keep remediation optional. Scope remains valuable as a read-first platform when all write capabilities are disabled.

## Beyond 2.3, based on evidence

- Team and governance capabilities only after real community demand is understood.
- Additional infrastructure sources based on maintained integrations rather than feature-count pressure.
- Broader automation only after the permission, approval and rollback model has proven safe in real deployments.

## Product guardrails

- **Inventory stays authoritative.** Discovery proposes and annotates; it does not silently rewrite intent.
- **Evidence before certainty.** Scope may show a probable cause, but it must expose why it reached that conclusion.
- **Read-first operations.** Scope explains and connects before it attempts to change infrastructure.
- **Agents remain optional.** Direct and agent-assisted operation can coexist; ordinary Scope use never requires an agent.
- **The public roadmap describes Community.** Every item in this document is planned for the AGPL-licensed Community edition unless it is explicitly labeled otherwise before implementation begins.
- **Context over feature count.** New work should clarify relationships or reduce incident effort.
- **Self-hosting remains complete.** Core infrastructure visibility and incident context must not depend on an external service.
- **Roadmap is not availability.** Planned and directional work is never marketed as shipped.

GitHub issues and discussions are used to validate problems and reprioritize this roadmap. Concrete use cases are more valuable than feature-count voting.
