import assert from "node:assert/strict";
import test from "node:test";
import { createMetricsRegistry } from "../src/metrics.mjs";

test("renders Prometheus target, database and request metrics", () => {
  const metrics = createMetricsRegistry({ version: "1.2.3", enabled: true });
  metrics.setDatabaseUp(true);
  metrics.updateStatuses("service", [{ targetId: "git", name: "GitLab", status: "up" }]);
  metrics.updateStatuses("remote", [{ targetId: "win", name: "Windows", status: "down" }]);
  metrics.updateDockerHosts([{ id: "docker", name: "Docker", status: "up", metrics: {
    cpuPercent: 12.5, memoryUsed: 100, memoryTotal: 200, diskUsed: 300,
    containersRunning: 2, containersStopped: 1, containersTotal: 3, volumes: 4, networks: 5, images: 6
  } }]);
  metrics.updateCertificates([{ id: "tls", name: "TLS", hostname: "scope.example", daysRemaining: 42 }]);
  metrics.recordRequest("GET", "/api/status", 200);
  metrics.recordRemoteSession();
  const output = metrics.render();
  assert.match(output, /scope_build_info\{version="1\.2\.3"\} 1/);
  assert.match(output, /scope_database_up 1/);
  assert.match(output, /scope_target_up\{type="service",id="git",name="GitLab"\} 1/);
  assert.match(output, /scope_target_up\{type="remote",id="win",name="Windows"\} 0/);
  assert.match(output, /scope_http_requests_total\{method="GET",route="\/api\/status",status="200"\} 1/);
  assert.match(output, /scope_remote_sessions_launched_total 1/);
  assert.match(output, /scope_docker_cpu_percent\{id="docker",name="Docker"\} 12\.5/);
  assert.match(output, /scope_docker_containers\{id="docker",name="Docker",state="running"\} 2/);
  assert.match(output, /scope_certificate_days_remaining\{id="tls",name="TLS",hostname="scope\.example"\} 42/);
});
