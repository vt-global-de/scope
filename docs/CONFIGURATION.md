# Inventory configuration

Scope uses one YAML inventory with `version: 1`. The canonical example is `config/inventory.yaml`; `config/inventory.schema.json` provides editor completion and structural validation.

For VS Code or a compatible YAML language server, keep this first line in the inventory:

```yaml
# yaml-language-server: $schema=./inventory.schema.json
```

Validate a file before deployment:

```sh
npm run config:check -- /path/to/inventory.yaml
```

Stable IDs are part of the configuration contract. Do not change group, category, service or server IDs merely to rename their visible labels, because IDs connect dependencies, status history and personal layouts.

The version 1 schema remains backward compatible throughout Scope 1.x. Removed or renamed fields require a new inventory version and an explicit migration guide.

## Service health checks

Every service URL is checked automatically. The optional `health` block makes that check explicit without coupling Scope to the application or proxy in front of it:

```yaml
services:
  - id: scope
    name: Scope
    url: https://scope.example.com
    health:
      path: /readyz
      method: GET
      expected-status: [200]
      follow-redirects: false
      timeout-ms: 3000
```

## Read-only discovery

Discovery is optional and never rewrites `inventory.yaml`. All providers emit the same normalized model, so drift comparison and diagnostics are independent of the software supplying the data.

Discovery providers may define `depends-on` with one or more configured server IDs. Newly discovered services inherit this relationship automatically. Docker providers default to their `server`. For reverse-proxy providers, Scope first uses an explicit `depends-on` value and otherwise derives it from a configured service whose hostname matches the provider URL. The dependency remains a relationship to real servers; Scope does not make services depend on Traefik, Caddy, or Nginx Proxy Manager as products.

Docker uses an already configured server connection:

```yaml
discovery:
  enabled: true
  providers:
    - id: local-docker
      name: Local Docker
      type: docker
      server: local-docker
```

Reverse proxies use the generic `reverse-proxy` provider plus an optional adapter. Scope 1.1 supports `traefik`, `caddy`, and `nginx-proxy-manager`; none is required:

```yaml
discovery:
  enabled: true
  providers:
    - id: public-routes
      name: Public routes
      type: reverse-proxy
      driver: caddy
      url: http://caddy:2019
      token-env: DISCOVERY_PUBLIC_ROUTES_TOKEN
      authoritative: false
```

Secrets are referenced by environment-variable name through `token-env`, not stored in the inventory. Set `authoritative: true` only when that provider is expected to contain every configured route in its coverage. Only authoritative providers may classify an absent configured route as `missing`; otherwise Scope reports it as `unknown` to avoid false alarms.

The named variable must also be passed into the Scope container. `compose.yaml` includes `DISCOVERY_EDGE_TOKEN` as an example; additional provider-specific variables can be added in the same way.

Discovery is presented as an administrator-only **Service Inbox** in the Services workspace. It is not a general inventory editor: Docker observations, servers, notifications, and already configured resources are not exposed as editable Discovery items. Guided read-only troubleshooting remains available on the relevant service and server views.

Unmanaged reverse-proxy routes enter a PostgreSQL-backed inbox grouped by provider. Pending entries stay compact until an administrator chooses **Add**. Scope then derives a concise service ID and readable name from the discovered hostname, suggests an icon, server dependencies and a destination, and allows the service to be placed into an existing panel, a new panel in an existing area, or a new area and panel. A proposal can instead be rejected with one action. Accepted proposals remain directly editable until deployment, rejected decisions remain reversible, and accepted draft destinations can be reused by later proposals.

Scope never writes the mounted `inventory.yaml`. The Service Inbox copies or downloads a complete merged file while preserving existing YAML comments. Commit that file to the inventory's source repository and redeploy Scope; only the deployed YAML becomes runtime state. Once an accepted service appears in the deployed inventory, it no longer appears as an unmanaged Discovery proposal.
