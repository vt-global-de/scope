import assert from "node:assert/strict";
import test from "node:test";
import { resolveConnection, toPublicConnection, validateRemoteConfig } from "../src/remote-config.mjs";

const connection = {
  id: "linux-01",
  name: "Linux 01",
  scope: "ignore",
  protocol: "ssh",
  environment: "Development",
  parameters: { hostname: "linux-01.internal", username: "${SSH_USER}", password: "${SSH_PASSWORD}" }
};

test("validates SSH and RDP connections", () => {
  assert.equal(validateRemoteConfig({ connections: [connection] }).connections[0], connection);
  assert.throws(() => validateRemoteConfig({ connections: [{ ...connection, protocol: "telnet" }] }), /ssh oder rdp/);
});

test("resolves secrets only for a launch", () => {
  const resolved = resolveConnection(connection, { SSH_USER: "operator", SSH_PASSWORD: "secret" });
  assert.equal(resolved.parameters.username, "operator");
  assert.equal(resolved.parameters.password, "secret");
  assert.equal(resolved.parameters.port, "22");
  assert.deepEqual(toPublicConnection(connection), {
    id: "linux-01",
    name: "Linux 01",
    description: "",
    environment: "Development",
    groupId: "general",
    groupName: "Development",
    category: "Servers",
    categoryCollapsed: false,
    tags: [],
    favorite: false,
    scope: "ignore",
    protocol: "ssh",
    probe: "tcp",
    icon: "SSH",
    certificateMonitoring: false,
    dnsMonitoring: false
  });
});

test("fails closed if a referenced secret is missing", () => {
  assert.throws(() => resolveConnection(connection, {}), /SSH_USER fehlt/);
});

test("validates explicit handshake probes and hardened connection options", () => {
  const hardened = structuredClone(connection);
  hardened.probe = "handshake";
  hardened.parameters["host-key-policy"] = "strict";
  hardened.parameters["known-hosts-file"] = "/run/secrets/known_hosts";
  assert.equal(validateRemoteConfig({ connections: [hardened] }).connections[0], hardened);
  assert.throws(() => validateRemoteConfig({ connections: [{ ...hardened, probe: "ping" }] }), /tcp oder handshake/);
});

test("rejects unsafe launch parameters", () => {
  assert.throws(
    () => resolveConnection({ ...connection, parameters: { ...connection.parameters, hostname: "-oProxyCommand=bad" } }, { SSH_USER: "operator", SSH_PASSWORD: "secret" }),
    /Hostname/
  );
  assert.throws(
    () => resolveConnection({ ...connection, parameters: { ...connection.parameters, port: "70000" } }, { SSH_USER: "operator", SSH_PASSWORD: "secret" }),
    /Port/
  );
});
