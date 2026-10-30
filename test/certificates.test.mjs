import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { checkCertificate, validateCertificates } from "../src/certificates.mjs";

function fakeTls({ authorized = true, validTo = "Jan 01 00:00:00 2035 GMT" } = {}) {
  return () => {
    const socket = new EventEmitter();
    socket.authorized = authorized;
    socket.authorizationError = authorized ? null : "SELF_SIGNED_CERT_IN_CHAIN";
    socket.setTimeout = () => {};
    socket.destroy = () => {};
    socket.getPeerCertificate = () => ({ valid_to: validTo, issuer: { O: "Test CA" }, subject: { CN: "example.test" } });
    queueMicrotask(() => socket.emit("secureConnect"));
    return socket;
  };
}

test("checks TLS certificate metadata", async () => {
  const owner = { kind: "service", groupIndex: 0, panelIndex: 0, itemIndex: 0 };
  const certificate = { id: "web", name: "Web", hostname: "example.test", environment: "Test", owner };
  validateCertificates([certificate]);
  const result = await checkCertificate(certificate, { connectImpl: fakeTls() });
  assert.equal(result.status, "up");
  assert.equal(result.issuer, "Test CA");
  assert.deepEqual(result.owner, owner);
  assert.ok(result.daysRemaining > 0);
});

test("marks untrusted certificates down", async () => {
  const result = await checkCertificate(
    { id: "web", name: "Web", hostname: "example.test" },
    { connectImpl: fakeTls({ authorized: false }) }
  );
  assert.equal(result.status, "down");
  assert.match(result.detail, /SELF_SIGNED/);
});
