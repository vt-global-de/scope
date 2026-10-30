function escapeLabel(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll('"', '\\"');
}

function labels(values) {
  return Object.entries(values).map(([name, value]) => `${name}="${escapeLabel(value)}"`).join(",");
}

export function createMetricsRegistry({ version = "unknown", enabled = process.env.PROMETHEUS_METRICS_ENABLED === "true" } = {}) {
  const startedAt = Date.now();
  const targets = new Map();
  const dockerHosts = new Map();
  const certificates = new Map();
  const requests = new Map();
  let remoteSessions = 0;
  let databaseUp = 0;

  return {
    enabled,
    setDatabaseUp(value) { databaseUp = value ? 1 : 0; },
    updateStatuses(targetType, entries) {
      for (const [key, target] of targets) if (target.targetType === targetType) targets.delete(key);
      for (const entry of entries) {
        if (!entry?.targetId || !["up", "down"].includes(entry.status)) continue;
        targets.set(`${targetType}:${entry.targetId}`, {
          targetType,
          targetId: entry.targetId,
          name: entry.name || entry.targetId,
          status: entry.status
        });
      }
    },
    updateDockerHosts(hosts) {
      dockerHosts.clear();
      for (const host of hosts) if (host?.id && host.status === "up" && host.metrics) dockerHosts.set(host.id, host);
    },
    updateCertificates(items) {
      certificates.clear();
      for (const item of items) if (item?.id && Number.isFinite(item.daysRemaining)) certificates.set(item.id, item);
    },
    recordRequest(method, route, statusCode) {
      const key = JSON.stringify([method, route, statusCode]);
      requests.set(key, (requests.get(key) ?? 0) + 1);
    },
    recordRemoteSession() { remoteSessions += 1; },
    render() {
      const lines = [
        "# HELP scope_build_info Scope build information.",
        "# TYPE scope_build_info gauge",
        `scope_build_info{${labels({ version })}} 1`,
        "# HELP scope_uptime_seconds Scope process uptime in seconds.",
        "# TYPE scope_uptime_seconds gauge",
        `scope_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
        "# HELP scope_database_up Whether the configured PostgreSQL database is reachable.",
        "# TYPE scope_database_up gauge",
        `scope_database_up ${databaseUp}`,
        "# HELP scope_target_up Current target status (1 = up, 0 = down).",
        "# TYPE scope_target_up gauge"
      ];
      for (const target of [...targets.values()].sort((a, b) => `${a.targetType}:${a.targetId}`.localeCompare(`${b.targetType}:${b.targetId}`))) {
        lines.push(`scope_target_up{${labels({ type: target.targetType, id: target.targetId, name: target.name })}} ${target.status === "up" ? 1 : 0}`);
      }
      lines.push(
        "# HELP scope_docker_cpu_percent Docker container CPU usage relative to host capacity.",
        "# TYPE scope_docker_cpu_percent gauge",
        "# HELP scope_docker_memory_used_bytes Memory used by running Docker containers.",
        "# TYPE scope_docker_memory_used_bytes gauge",
        "# HELP scope_docker_memory_total_bytes Total memory reported by the Docker host.",
        "# TYPE scope_docker_memory_total_bytes gauge",
        "# HELP scope_docker_disk_used_bytes Space used by Docker data.",
        "# TYPE scope_docker_disk_used_bytes gauge",
        "# HELP scope_docker_containers Docker containers by state.",
        "# TYPE scope_docker_containers gauge",
        "# HELP scope_docker_objects Docker objects by type.",
        "# TYPE scope_docker_objects gauge"
      );
      for (const host of dockerHosts.values()) {
        const hostLabels = { id: host.id, name: host.name };
        lines.push(
          `scope_docker_cpu_percent{${labels(hostLabels)}} ${host.metrics.cpuPercent}`,
          `scope_docker_memory_used_bytes{${labels(hostLabels)}} ${host.metrics.memoryUsed}`,
          `scope_docker_memory_total_bytes{${labels(hostLabels)}} ${host.metrics.memoryTotal}`
        );
        if (Number.isFinite(host.metrics.diskUsed)) lines.push(`scope_docker_disk_used_bytes{${labels(hostLabels)}} ${host.metrics.diskUsed}`);
        for (const [state, value] of [["running", host.metrics.containersRunning], ["stopped", host.metrics.containersStopped], ["total", host.metrics.containersTotal]]) {
          lines.push(`scope_docker_containers{${labels({ ...hostLabels, state })}} ${value}`);
        }
        for (const [type, value] of [["volumes", host.metrics.volumes], ["networks", host.metrics.networks], ["images", host.metrics.images]]) {
          lines.push(`scope_docker_objects{${labels({ ...hostLabels, type })}} ${value}`);
        }
      }
      lines.push(
        "# HELP scope_certificate_days_remaining Days until a monitored TLS certificate expires.",
        "# TYPE scope_certificate_days_remaining gauge"
      );
      for (const certificate of certificates.values()) {
        lines.push(`scope_certificate_days_remaining{${labels({ id: certificate.id, name: certificate.name, hostname: certificate.hostname })}} ${certificate.daysRemaining}`);
      }
      lines.push(
        "# HELP scope_http_requests_total HTTP responses served by Scope.",
        "# TYPE scope_http_requests_total counter"
      );
      for (const [key, count] of requests) {
        const [method, route, statusCode] = JSON.parse(key);
        lines.push(`scope_http_requests_total{${labels({ method, route, status: statusCode })}} ${count}`);
      }
      lines.push(
        "# HELP scope_remote_sessions_launched_total Remote sessions launched since process start.",
        "# TYPE scope_remote_sessions_launched_total counter",
        `scope_remote_sessions_launched_total ${remoteSessions}`
      );
      return `${lines.join("\n")}\n`;
    }
  };
}
