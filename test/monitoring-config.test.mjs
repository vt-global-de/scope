import assert from "node:assert/strict";
import test from "node:test";
import { resolveMonitoringHost, toPublicMonitoringHost, validateMonitoringConfig } from "../src/monitoring-config.mjs";

test("validates socket, TCP and TLS connections", () => {
  const config = { hosts: [
    { id: "local", name: "Local", scope: "ignore", "remote-connection": "ssh-local", connection: { type: "socket" } },
    { id: "tcp", name: "TCP", connection: { type: "tcp", hostname: "docker.internal" } },
    { id: "tls", name: "TLS", connection: { type: "tls", hostname: "docker.internal", "cert-file": "/cert.pem", "key-file": "/key.pem" } }
  ] };
  assert.equal(validateMonitoringConfig(config), config);
  assert.equal(resolveMonitoringHost(config.hosts[0]).connection.path, "/var/run/docker.sock");
  assert.equal(toPublicMonitoringHost(config.hosts[0]).remoteConnection, "ssh-local");
  assert.equal(toPublicMonitoringHost(config.hosts[0]).scope, "ignore");
  assert.equal(resolveMonitoringHost(config.hosts[1]).connection.port, 2375);
  assert.equal(resolveMonitoringHost(config.hosts[2]).connection.port, 2376);
});

test("allows TLS on a custom port", () => {
  const host = resolveMonitoringHost({ id: "tls", name: "TLS", connection: { type: "tls", hostname: "docker.internal", port: 2375 } });
  assert.equal(host.connection.port, 2375);
});

test("rejects incomplete client certificates", () => {
  assert.throws(() => validateMonitoringConfig({ hosts: [{
    id: "tls", name: "TLS", connection: { type: "tls", hostname: "docker.internal", "cert-file": "/cert.pem" }
  }] }), /gemeinsam/);
});
