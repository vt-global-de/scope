import assert from "node:assert/strict";
import test from "node:test";
import { createFreeRdpInvocation } from "../src/freerdp.mjs";
import { createRemoteSessionManager } from "../src/remote-sessions.mjs";

test("passes all FreeRDP arguments through stdin without exposing credentials in the process list", () => {
  const invocation = createFreeRdpInvocation({
    hostname: "windows.example.internal",
    port: "3389",
    username: "operator@example.com",
    password: "secret value",
    domain: "EXAMPLE",
    security: "nla",
    "ignore-cert": "true",
    clipboard: "true"
  }, 1440, 900);

  assert.deepEqual(invocation.commandArguments, ["/args-from:stdin"]);
  assert.match(invocation.standardInput, /^\/v:windows\.example\.internal:3389$/m);
  assert.match(invocation.standardInput, /^\/u:operator@example\.com$/m);
  assert.match(invocation.standardInput, /^\/p:secret value$/m);
  assert.match(invocation.standardInput, /^\/d:EXAMPLE$/m);
  assert.match(invocation.standardInput, /^\/sec:nla$/m);
  assert.match(invocation.standardInput, /^\/cert:ignore$/m);
  assert.match(invocation.standardInput, /^\+clipboard$/m);
  assert.match(invocation.standardInput, /^\+dynamic-resolution$/m);
});

test("rejects line breaks in FreeRDP arguments", () => {
  assert.throws(() => createFreeRdpInvocation({
    hostname: "windows.example.internal",
    port: "3389",
    username: "operator",
    password: "first\n/drive:shared,/tmp"
  }, 1440, 900), /Zeilenumbrüche/);
});

test("limits concurrent sessions and exposes sanitized diagnostics without loading the native PTY", async () => {
  const manager = createRemoteSessionManager({ maxSessions: 1, idleTimeoutMs: 60_000 });
  const connection = {
    id: "linux", name: "Linux", protocol: "ssh",
    parameters: { hostname: "linux.internal", port: "22", username: "operator", password: "secret" }
  };
  const session = await manager.create(connection, "tester");
  const diagnostic = manager.diagnostics(session.id, "tester");
  assert.equal(diagnostic.connectionId, "linux");
  assert.doesNotMatch(JSON.stringify(diagnostic), /secret/);
  assert.equal(manager.diagnostics(session.id, "another-user"), null);
  assert.equal(manager.close(session.id, "another-user"), false);
  await assert.rejects(() => manager.create(connection, "tester"), (error) => error.statusCode === 429);
  manager.closeAll();
});
