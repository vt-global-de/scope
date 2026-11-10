import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseServer, diagnoseUrl } from "../src/diagnostics.mjs";

test("diagnoses URL through DNS, TCP and HTTP in order", async () => {
  const result = await diagnoseUrl("https://scope.example.test", {
    lookupImpl: async () => [{ address: "192.0.2.10" }],
    tcpImpl: async () => "scope.example.test:443",
    tlsImpl: async () => "TLSv1.3",
    checkImpl: async () => ({ status: "up", detail: "HTTP 200" })
  });
  assert.equal(result.status, "up");
  assert.deepEqual(result.steps.map((step) => step.name), ["dns", "tcp", "tls", "http"]);
});

test("stops diagnostics after failed DNS lookup", async () => {
  const result = await diagnoseUrl("https://scope.example.test", {
    lookupImpl: async () => { throw new Error("ENOTFOUND"); }
  });
  assert.equal(result.status, "down");
  assert.equal(result.steps.length, 1);
});

test("diagnoses Docker and remote access without binding them together", async () => {
  const result = await diagnoseServer({
    id: "host", name: "Host",
    monitoring: { connection: { type: "socket" } },
    remote: { protocol: "ssh", parameters: { hostname: "host.example.test", username: "scope", password: "secret" } }
  }, {
    lookupImpl: async () => [{ address: "192.0.2.20" }],
    dockerImpl: async () => ({ Version: "28.0.0" }),
    remoteImpl: async () => ({ status: "up", detail: "SSH handshake successful" })
  });
  assert.equal(result.status, "up");
  assert.deepEqual(result.steps.map((step) => step.name), ["dns", "docker", "ssh"]);
});
