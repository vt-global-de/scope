import assert from "node:assert/strict";
import test from "node:test";
import { requestOriginAllowed } from "../src/server.mjs";

function request({ method = "POST", origin, site, host = "scope.example.test" } = {}) {
  return {
    method,
    headers: { host, ...(origin ? { origin } : {}), ...(site ? { "sec-fetch-site": site } : {}) },
    socket: { encrypted: true }
  };
}

test("rejects cross-origin state changes", () => {
  assert.equal(requestOriginAllowed(request({ origin: "https://scope.example.test" }), "https://scope.example.test"), true);
  assert.equal(requestOriginAllowed(request({ origin: "https://attacker.example" }), "https://scope.example.test"), false);
  assert.equal(requestOriginAllowed(request({ site: "cross-site" }), "https://scope.example.test"), false);
  assert.equal(requestOriginAllowed(request({ method: "GET", origin: "https://attacker.example" }), "https://scope.example.test"), true);
});
