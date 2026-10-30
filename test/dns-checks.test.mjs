import assert from "node:assert/strict";
import test from "node:test";
import { checkDns, validateDnsChecks } from "../src/dns-checks.mjs";

test("resolves and validates expected DNS answers", async () => {
  const owner = { kind: "server", id: "app-01" };
  const check = { id: "app-a", name: "App", hostname: "app.test", type: "A", expected: ["192.0.2.10"], owner };
  validateDnsChecks([check]);
  const result = await checkDns(check, {
    resolverFactory: () => ({ setServers() {}, resolve: async () => ["192.0.2.10"] })
  });
  assert.equal(result.status, "up");
  assert.deepEqual(result.answers, ["192.0.2.10"]);
  assert.deepEqual(result.owner, owner);
});

test("marks unexpected DNS answers down", async () => {
  const result = await checkDns(
    { id: "app-a", name: "App", hostname: "app.test", type: "A", expected: ["192.0.2.10"] },
    { resolverFactory: () => ({ setServers() {}, resolve: async () => ["192.0.2.11"] }) }
  );
  assert.equal(result.status, "down");
});
