# Scope roadmap

Scope is moving from a configuration-driven infrastructure overview toward a live infrastructure context and incident workspace. The YAML inventory remains the authoritative, reviewable source of intent throughout that evolution.

This roadmap describes direction and sequence, not release dates. Technical findings, maintenance cost and evidence from real deployments may change individual items or their priority. A capability is available only after it appears in a released changelog.

## 1.0 — Operational foundation · Shipped

- Stable YAML inventory v1 with validation, defaults, groups and categories.
- Service availability with integrated DNS and certificate checks.
- Docker host monitoring over sockets, TCP and TLS.
- Browser-based SSH and RDP sessions with roles and audit events.
- PostgreSQL-backed status history, users, preferences and layouts.
- SMTP and Discord notifications, maintenance windows and Prometheus metrics.

## 1.1 — Discovery and drift · Next

Goal: make Scope easier to adopt without replacing configuration as code.

- Read-only discovery for Docker hosts and containers.
- Discover routes and services from Traefik.
- Compare discovered infrastructure with `inventory.yaml`.
- Report configured targets that disappeared and unmanaged targets that appeared.
- Generate reviewable inventory suggestions or patches instead of silently writing configuration.
- Improve connection diagnostics for Docker, SSH, RDP, HTTP, DNS and TLS.

## 1.2 — Dependency intelligence · Planned

Goal: explain relationships instead of presenting every failed check as an isolated outage.

- Visual dependency graph for services, servers and infrastructure edges.
- Root-cause grouping when one dependency affects multiple targets.
- Blast-radius overview for affected services and environments.
- Dependency-aware incident signals and notification suppression.
- Explicit modelling for reverse proxies, DNS and storage dependencies.

## 1.3 — Incident workspace · Planned

Goal: bring useful diagnosis into the context of the affected target.

- Unified incident timeline from status transitions, checks and notifications.
- Markdown runbooks linked from services and servers.
- Relevant diagnostics, dependencies and recent events in one view.
- Context links into Grafana, Loki, Prometheus and specialist management tools.
- Exportable incident summary without turning Scope into a ticketing system.

## 1.4 — Scope Agent · Exploring

Goal: collect useful signals across network zones without broadly exposing management APIs.

- Small agent with an outbound-only connection to Scope.
- Host, Docker and selected system-service signals.
- HTTP, TCP, DNS and network checks from multiple points of view.
- Least-privilege enrollment and revocation.
- Evaluate secure remote-session transport without weakening network boundaries.

## Later, based on evidence

- Docker Swarm and Kubernetes inventory sources.
- OIDC, LDAP and stronger multi-factor authentication options.
- A supported extension model for infrastructure sources and contextual integrations.
- An official Grafana dashboard for Scope metrics.
- Team and governance capabilities only after real community demand is understood.

## Product guardrails

- **Inventory stays authoritative.** Discovery proposes; it does not silently rewrite intent.
- **Read-first operations.** Scope explains and connects before replacing specialist tools.
- **Context over feature count.** New work should clarify relationships or reduce incident effort.
- **Self-hosting remains complete.** Core infrastructure visibility must not depend on an external service.
- **Roadmap is not availability.** Planned and exploratory work is never marketed as shipped.

After the public GitHub launch, issues and discussions will be used to validate problems and reprioritize this roadmap. Concrete use cases are more valuable than feature-count voting.

