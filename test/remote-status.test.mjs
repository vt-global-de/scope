import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { checkRemoteConnection, remoteProbeTarget } from "../src/remote-status.mjs";

const connection = { id: "host-01", protocol: "ssh", parameters: { hostname: "${HOST}", port: "${PORT}" } };

test("resolves TCP probe targets without resolving credentials", () => {
  assert.deepEqual(remoteProbeTarget(connection, { HOST: "127.0.0.1", PORT: "2222" }), { hostname: "127.0.0.1", port: 2222 });
});

test("reports an accepting TCP target as up", async () => {
  const socket = new EventEmitter();
  socket.setTimeout = () => {};
  socket.destroy = () => {};
  const connectImpl = () => {
    queueMicrotask(() => socket.emit("connect"));
    return socket;
  };
  const result = await checkRemoteConnection({
    id: "local",
    protocol: "ssh",
    parameters: { hostname: "127.0.0.1", port: "22" }
  }, { connectImpl });
  assert.equal(result.status, "up");
});

test("requires a protocol banner in handshake mode", async () => {
  const socket = new EventEmitter();
  socket.setTimeout = () => {};
  socket.destroy = () => {};
  socket.write = () => {};
  const connectImpl = () => {
    queueMicrotask(() => { socket.emit("connect"); socket.emit("data", Buffer.from("SSH-2.0-OpenSSH")); });
    return socket;
  };
  const result = await checkRemoteConnection({
    id: "local", protocol: "ssh", probe: "handshake", parameters: { hostname: "127.0.0.1", port: "22" }
  }, { connectImpl });
  assert.equal(result.code, "handshake_ok");
});

test("reports a refused TCP target as down", async () => {
  const socket = new EventEmitter();
  socket.setTimeout = () => {};
  socket.destroy = () => {};
  const connectImpl = () => {
    queueMicrotask(() => socket.emit("error", Object.assign(new Error("refused"), { code: "ECONNREFUSED" })));
    return socket;
  };
  const result = await checkRemoteConnection({
    id: "local",
    protocol: "rdp",
    parameters: { hostname: "127.0.0.1", port: "3389" }
  }, { connectImpl });
  assert.equal(result.status, "down");
  assert.equal(result.code, "connection_refused");
  assert.match(result.detail, /lehnt die Verbindung ab/);
});

test("distinguishes DNS failures from network failures", async () => {
  const socket = new EventEmitter();
  socket.setTimeout = () => {};
  socket.destroy = () => {};
  const connectImpl = () => {
    queueMicrotask(() => socket.emit("error", Object.assign(new Error("not found"), { code: "ENOTFOUND" })));
    return socket;
  };
  const result = await checkRemoteConnection({
    id: "dns", name: "DNS target", protocol: "rdp", parameters: { hostname: "missing.example", port: "3389" }
  }, { connectImpl });
  assert.equal(result.code, "dns_failed");
  assert.match(result.detail, /DNS-Auflösung/);
});
