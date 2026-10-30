import { readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { resolveMonitoringHost, toPublicMonitoringHost } from "./monitoring-config.mjs";
import { mapWithConcurrency } from "./check-runner.mjs";

const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;

async function tlsOptions(connection) {
  const options = {
    rejectUnauthorized: connection["reject-unauthorized"] !== false,
    servername: connection["server-name"] ?? connection.hostname
  };
  if (connection["ca-file"]) options.ca = await readFile(connection["ca-file"]);
  if (connection["cert-file"]) options.cert = await readFile(connection["cert-file"]);
  if (connection["key-file"]) options.key = await readFile(connection["key-file"]);
  return options;
}

export async function dockerApiRequest(connection, path, { timeoutMs = 10000, requestImpl } = {}) {
  const secure = connection.type === "tls";
  const implementation = requestImpl ?? (secure ? httpsRequest : httpRequest);
  const options = connection.type === "socket"
    ? { socketPath: connection.path, path, method: "GET" }
    : {
        hostname: connection.hostname,
        port: connection.port,
        path,
        method: "GET",
        ...(secure ? await tlsOptions(connection) : {})
      };

  return new Promise((resolve, reject) => {
    const request = implementation(options, (response) => {
      const chunks = [];
      let length = 0;
      response.on("data", (chunk) => {
        length += chunk.length;
        if (length > MAX_RESPONSE_BYTES) {
          request.destroy(new Error("Docker-API-Antwort ist zu groß."));
          return;
        }
        chunks.push(chunk);
      });
      response.once("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Docker API HTTP ${response.statusCode}: ${body.slice(0, 180)}`));
          return;
        }
        try { resolve(body ? JSON.parse(body) : null); }
        catch { reject(new Error(`Docker API lieferte für ${path} kein gültiges JSON.`)); }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("Docker-API-Zeitüberschreitung.")));
    request.once("error", reject);
    request.end();
  });
}

function containerCpuPercent(stats, hostCpus) {
  const cpuDelta = (stats.cpu_stats?.cpu_usage?.total_usage ?? 0) - (stats.precpu_stats?.cpu_usage?.total_usage ?? 0);
  const systemDelta = (stats.cpu_stats?.system_cpu_usage ?? 0) - (stats.precpu_stats?.system_cpu_usage ?? 0);
  const onlineCpus = stats.cpu_stats?.online_cpus || stats.cpu_stats?.cpu_usage?.percpu_usage?.length || hostCpus || 1;
  return systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0;
}

function dockerDiskUsage(systemDf) {
  const containerBytes = (systemDf.Containers ?? []).reduce((total, container) => total + Math.max(0, container.SizeRw ?? 0), 0);
  const volumeBytes = (systemDf.Volumes ?? []).reduce((total, volume) => total + Math.max(0, volume.UsageData?.Size ?? 0), 0);
  return Math.max(0, systemDf.LayersSize ?? 0) + containerBytes + volumeBytes;
}

export async function collectDockerMetrics(connection, options = {}) {
  const { dockerRequestImpl = dockerApiRequest, ...requestOptions } = options;
  const get = (path) => dockerRequestImpl(connection, path, requestOptions);
  const [info, containers, volumes, networks, images, systemDf] = await Promise.all([
    get("/info"),
    get("/containers/json?all=1"),
    get("/volumes"),
    get("/networks"),
    get("/images/json"),
    get("/system/df").catch(() => null)
  ]);
  const running = containers.filter((container) => container.State === "running");
  const stats = await mapWithConcurrency(running, options.concurrency ?? 8,
    (container) => get(`/containers/${encodeURIComponent(container.Id)}/stats?stream=false`));
  const hostCpus = Math.max(1, info.NCPU ?? 1);
  const cpuPercent = stats.reduce((total, value) => total + containerCpuPercent(value, hostCpus), 0) / hostCpus;
  const memoryUsed = stats.reduce((total, value) => total + Math.max(0, value.memory_stats?.usage ?? 0), 0);
  return {
    cpuPercent: Math.min(100, cpuPercent),
    cpuCores: hostCpus,
    memoryTotal: Math.max(0, info.MemTotal ?? 0),
    memoryUsed,
    diskUsed: systemDf ? dockerDiskUsage(systemDf) : null,
    containersTotal: containers.length,
    containersRunning: running.length,
    containersStopped: containers.length - running.length,
    volumes: volumes.Volumes?.length ?? 0,
    networks: networks.length,
    images: images.length
  };
}

function safeError(error) {
  return String(error?.message || "Docker-Monitoring fehlgeschlagen").replace(/[\r\n\t]+/g, " ").trim().slice(0, 240);
}

export async function collectDockerHost(rawHost, options = {}) {
  const publicHost = toPublicMonitoringHost(rawHost);
  try {
    const host = resolveMonitoringHost(rawHost);
    const metrics = await collectDockerMetrics(host.connection, options);
    return { ...publicHost, status: "up", checkedAt: new Date().toISOString(), metrics };
  } catch (error) {
    return { ...publicHost, status: "down", checkedAt: new Date().toISOString(), error: safeError(error) };
  }
}

export function createMonitoringCollector(getConfig, options = {}) {
  const ttlMs = options.ttlMs ?? 30000;
  let cache;
  let cachedAt = 0;
  let signature = "";
  let pending;
  return async function getMonitoring() {
    const config = await getConfig();
    const hosts = config.hosts.filter((host) => host.enabled !== false);
    const nextSignature = JSON.stringify(hosts);
    if (cache && signature === nextSignature && Date.now() - cachedAt < ttlMs) return cache;
    if (pending && signature === nextSignature) return pending;
    signature = nextSignature;
    const current = mapWithConcurrency(hosts, options.concurrency ?? 8, (host) => collectDockerHost(host, options));
    pending = current;
    try {
      const result = await current;
      if (signature === nextSignature) { cache = result; cachedAt = Date.now(); }
      return result;
    } finally {
      if (pending === current) pending = undefined;
    }
  };
}
