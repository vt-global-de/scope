import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { collectDockerHost, collectDockerMetrics, dockerApiRequest } from "../src/monitoring.mjs";

const responses = {
  "/info": { NCPU: 2, MemTotal: 8_000 },
  "/containers/json?all=1": [{ Id: "one", State: "running" }, { Id: "two", State: "exited" }],
  "/containers/one/stats?stream=false": {
    cpu_stats: { system_cpu_usage: 2_000, online_cpus: 2, cpu_usage: { total_usage: 200 } },
    precpu_stats: { system_cpu_usage: 1_000, cpu_usage: { total_usage: 100 } },
    memory_stats: { usage: 2_000 }
  },
  "/volumes": { Volumes: [{ Name: "data" }] },
  "/networks": [{ Id: "network" }],
  "/images/json": [{ Id: "image" }],
  "/system/df": { LayersSize: 1_000, Containers: [{ SizeRw: 50 }], Volumes: [{ UsageData: { Size: 25 } }] }
};

const dockerRequestImpl = async (_connection, path) => responses[path];

function successfulRequest(checkOptions, responseBody = { ok: true }) {
  return (options, callback) => {
    checkOptions(options);
    const request = new EventEmitter();
    request.setTimeout = () => {};
    request.destroy = (error) => { if (error) request.emit("error", error); };
    request.end = () => queueMicrotask(() => {
      const response = new EventEmitter();
      response.statusCode = 200;
      callback(response);
      response.emit("data", Buffer.from(JSON.stringify(responseBody)));
      response.emit("end");
    });
    return request;
  };
}

test("connects through a Unix socket", async () => {
  const result = await dockerApiRequest(
    { type: "socket", path: "/var/run/docker.sock" },
    "/info",
    { requestImpl: successfulRequest((options) => {
      assert.equal(options.socketPath, "/var/run/docker.sock");
      assert.equal(options.path, "/info");
    }) }
  );
  assert.deepEqual(result, { ok: true });
});

test("connects through configurable TLS", async () => {
  await dockerApiRequest(
    { type: "tls", hostname: "docker.internal", port: 2375, "reject-unauthorized": false },
    "/info",
    { requestImpl: successfulRequest((options) => {
      assert.equal(options.hostname, "docker.internal");
      assert.equal(options.port, 2375);
      assert.equal(options.rejectUnauthorized, false);
    }) }
  );
});

test("collects metrics through the Docker Engine API", async () => {
  const metrics = await collectDockerMetrics({ type: "socket", path: "/docker.sock" }, { dockerRequestImpl });
  assert.equal(metrics.cpuPercent, 10);
  assert.equal(metrics.memoryUsed, 2_000);
  assert.equal(metrics.diskUsed, 1_075);
  assert.equal(metrics.containersRunning, 1);
  assert.equal(metrics.containersStopped, 1);
  assert.equal(metrics.containersTotal, 2);
  assert.equal(metrics.volumes, 1);
});

test("keeps monitoring up when system df is blocked by a socket proxy", async () => {
  const metrics = await collectDockerMetrics({ type: "tls", hostname: "docker.internal", port: 443 }, {
    dockerRequestImpl: async (_connection, path) => {
      if (path === "/system/df") throw new Error("Docker API HTTP 403");
      return responses[path];
    }
  });
  assert.equal(metrics.diskUsed, null);
  assert.equal(metrics.containersRunning, 1);
});

test("returns connection errors without exposing config internals", async () => {
  const result = await collectDockerHost(
    { id: "docker-01", name: "Docker 01", connection: { type: "tcp", hostname: "docker.internal" } },
    { dockerRequestImpl: async () => { throw new Error("connection refused"); } }
  );
  assert.equal(result.status, "down");
  assert.match(result.error, /connection refused/);
  assert.equal(result.connectionType, "tcp");
});
