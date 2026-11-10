import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProviderInventory, calculateDrift, createDiscoveryManager, discoveryProviderDependencies,
  normalizeCaddy, normalizeNpm, normalizeTraefik
} from "../src/discovery.mjs";

test("normalizes routes from supported reverse proxy adapters", () => {
  assert.equal(normalizeTraefik([{ name: "app", rule: "Host(`app.example.test`)" }], "edge")[0].hostname, "app.example.test");
  assert.equal(normalizeCaddy({ routes: [{ match: [{ host: ["caddy.example.test"] }] }] }, "edge")[0].hostname, "caddy.example.test");
  assert.equal(normalizeNpm([{ id: 1, domain_names: ["npm.example.test"], forward_host: "app", forward_port: 8080 }], "edge")[0].hostname, "npm.example.test");
});

test("marks missing services only for authoritative reverse proxy providers", () => {
  const inventory = {
    title: "Scope",
    menu: { services: { groups: [{ id: "main", name: "Main", categories: [{ name: "Apps", services: [
      { id: "one", name: "One", url: "https://one.example.test" },
      { id: "two", name: "Two", url: "https://two.example.test" }
    ] }] }] } }
  };
  const snapshot = { status: "up", provider: { id: "edge", type: "reverse-proxy", authoritative: true }, targets: [], routes: [
    { id: "edge:one", hostname: "one.example.test", url: "https://one.example.test" },
    { id: "edge:extra", hostname: "extra.example.test", url: "https://extra.example.test" }
  ] };
  const drift = calculateDrift(inventory, [snapshot]);
  assert.deepEqual(drift.summary, { managed: 1, missing: 1, unmanaged: 1, changed: 0, unknown: 0 });
  assert.equal(drift.suggestions[0].providerId, "edge");
  assert.equal(drift.suggestions[0].id, "extra");
  assert.equal(drift.suggestions[0].name, "Extra");
  assert.equal("description" in drift.suggestions[0], false);
});

test("creates useful names and icon hints for discovered services", () => {
  const inventory = { title: "Scope", menu: { services: { groups: [] } } };
  const snapshot = {
    status: "up", provider: { id: "edge", type: "reverse-proxy" }, targets: [],
    routes: [{
      id: "edge:authentik", hostname: "vt-authentik-01.dev.example.test",
      url: "https://vt-authentik-01.dev.example.test", metadata: { service: "authentik@docker" }
    }]
  };
  const [suggestion] = calculateDrift(inventory, [snapshot]).suggestions;
  assert.deepEqual(suggestion, {
    id: "vt-authentik-01", name: "VT Authentik 01", url: "https://vt-authentik-01.dev.example.test",
    icon: "authentik", providerId: "edge"
  });
});

test("inherits server dependencies from the discovery provider", () => {
  const inventory = { title: "Scope", menu: { services: { groups: [] } } };
  const snapshot = {
    status: "up",
    provider: { id: "edge", type: "reverse-proxy", dependsOn: ["proxy-host"] },
    targets: [],
    routes: [{ id: "edge:app", hostname: "app.example.test", url: "https://app.example.test" }]
  };
  const [suggestion] = calculateDrift(inventory, [snapshot]).suggestions;
  assert.deepEqual(suggestion["depends-on"], ["proxy-host"]);
});

test("derives reverse-proxy dependencies from an existing proxy service", () => {
  const inventory = { menu: {
    services: { groups: [{ id: "main", name: "Main", categories: [{ id: "network", name: "Network", services: [{
      id: "proxy", name: "Proxy", url: "https://proxy.example.test", "depends-on": ["proxy-host"]
    }] }] }] }
  } };
  const provider = { id: "edge", type: "reverse-proxy", url: "https://proxy.example.test" };
  assert.deepEqual(discoveryProviderDependencies(inventory, provider), ["proxy-host"]);
  assert.deepEqual(discoveryProviderDependencies(inventory, { ...provider, "depends-on": ["explicit-host"] }), ["explicit-host"]);
});

test("keeps generated service IDs unique across multiple discovered domains", () => {
  const inventory = { title: "Scope", menu: { services: { groups: [] } } };
  const snapshot = {
    status: "up", provider: { id: "edge", type: "reverse-proxy" }, targets: [], routes: [
      { id: "edge:dev", hostname: "app.dev.example.test", url: "https://app.dev.example.test" },
      { id: "edge:prod", hostname: "app.prod.example.test", url: "https://app.prod.example.test" }
    ]
  };
  const suggestions = calculateDrift(inventory, [snapshot]).suggestions;
  assert.equal(suggestions[0].id, "app");
  assert.equal(suggestions[1].id, "app-prod-example-test");
});

test("builds a provider-first inventory without exposing Docker containers as inventory resources", () => {
  const inventory = {
    title: "Scope",
    discovery: { providers: [
      { id: "docker-provider", name: "Docker", type: "docker", server: "docker" },
      { id: "proxy", name: "Proxy", type: "reverse-proxy", driver: "traefik", url: "https://proxy.example.test" }
    ] },
    menu: {
      services: { groups: [{ id: "dev", name: "Development", categories: [{ id: "apps", name: "Apps", services: [
        { id: "managed", name: "Managed", url: "https://managed.example.test" },
        { id: "manual", name: "Manual", url: "https://manual.example.test", scope: "ignore" }
      ] }] }] },
      server: { groups: [{ id: "dev", name: "Development", categories: [{ id: "hosts", name: "Hosts", servers: [
        { id: "docker", name: "Docker", monitoring: { connection: { type: "socket" } } },
        { id: "manual-host", name: "Manual host", remote: { protocol: "ssh", parameters: { hostname: "manual.example.test" } } }
      ] }] }] }
    }
  };
  const snapshots = [
    {
      status: "up", provider: { id: "docker-provider", name: "Docker", type: "docker", serverId: "docker" },
      targets: [{ id: "container", name: "Container", kind: "container" }], routes: []
    },
    {
      status: "up", provider: { id: "proxy", name: "Proxy", type: "reverse-proxy", driver: "traefik" },
      targets: [], routes: [
        { id: "managed", hostname: "managed.example.test", url: "https://managed.example.test" },
        { id: "available", hostname: "available.example.test", url: "https://available.example.test" }
      ]
    }
  ];
  const drift = calculateDrift(inventory, snapshots);
  const result = buildProviderInventory(inventory, snapshots, drift);
  assert.deepEqual(result.summary.services, { total: 2, inScope: 1, ignored: 1 });
  assert.equal(result.providers[0].servers[0].id, "docker");
  assert.equal(result.providers[0].servers.some((server) => server.id === "container"), false);
  assert.equal(result.providers[1].services[0].id, "managed");
  assert.equal(result.providers[1].available[0].url, "https://available.example.test");
  assert.deepEqual(result.unassigned.services.map((service) => service.id), ["manual"]);
  assert.deepEqual(result.unassigned.servers.map((server) => server.id), ["manual-host"]);
});

test("discovers Docker containers through the normalized provider contract", async () => {
  const inventory = {
    title: "Scope", discovery: { providers: [{ id: "docker", type: "docker", server: "host" }] },
    menu: { server: { groups: [{ id: "local", name: "Local", categories: [{ name: "Hosts", servers: [{
      id: "host", name: "Host", monitoring: { connection: { type: "socket" } }
    }] }] }] } }
  };
  const discover = createDiscoveryManager(async () => inventory, {
    dockerRequest: async () => [{ Id: "abc", Names: ["/scope"], State: "running", Image: "scope:latest", Labels: { "example.secret": "not-exposed" } }]
  });
  const result = await discover();
  assert.equal(result.snapshots[0].status, "up");
  assert.equal(result.snapshots[0].targets[0].name, "scope");
  assert.deepEqual(result.snapshots[0].targets[0].labelKeys, ["example.secret"]);
  assert.equal("labels" in result.snapshots[0].targets[0], false);
});
