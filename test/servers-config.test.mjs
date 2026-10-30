import assert from "node:assert/strict";
import test from "node:test";
import { toMonitoringConfig, toRemoteConfig, validateServersConfig } from "../src/servers-config.mjs";

const config = {
  servers: [{
    id: "docker-01",
    name: "Docker 01",
    environment: "Development",
    groupId: "development",
    groupName: "Development",
    category: "Infrastructure",
    categoryCollapsed: true,
    tags: ["docker", "critical"],
    favorite: true,
    monitoring: { connection: { type: "socket" } },
    remote: {
      protocol: "ssh",
      parameters: { hostname: "docker-01.internal", username: "root", password: "secret" }
    }
  }]
};

test("derives monitoring and remote configuration from one server", () => {
  assert.equal(validateServersConfig(config), config);
  const monitoring = toMonitoringConfig(config);
  const remote = toRemoteConfig(config);
  assert.equal(monitoring.hosts[0]["remote-connection"], "docker-01");
  assert.equal(monitoring.hosts[0].connection.type, "socket");
  assert.equal(remote.connections[0].id, "docker-01");
  assert.equal(remote.connections[0].protocol, "ssh");
  assert.equal(monitoring.hosts[0].groupId, "development");
  assert.equal(remote.connections[0].category, "Infrastructure");
  assert.deepEqual(monitoring.hosts[0].tags, ["docker", "critical"]);
  assert.equal(remote.connections[0].favorite, true);
});

test("supports monitoring-only and remote-only servers", () => {
  const splitConfig = { servers: [
    { id: "monitor", name: "Monitor", monitoring: { connection: { type: "socket" } } },
    { id: "remote", name: "Remote", remote: { protocol: "ssh", parameters: { hostname: "host", username: "root", password: "secret" } } }
  ] };
  validateServersConfig(splitConfig);
  assert.equal(toMonitoringConfig(splitConfig).hosts.length, 1);
  assert.equal(toRemoteConfig(splitConfig).connections.length, 1);
});

test("passes dashboard scope to monitoring and remote views", () => {
  const scoped = structuredClone(config);
  scoped.servers[0].scope = "ignore";
  validateServersConfig(scoped);
  assert.equal(toMonitoringConfig(scoped).hosts[0].scope, "ignore");
  assert.equal(toRemoteConfig(scoped).connections[0].scope, "ignore");
});

test("rejects servers without a feature", () => {
  assert.throws(() => validateServersConfig({ servers: [{ id: "empty", name: "Empty" }] }), /monitoring oder remote/);
});
