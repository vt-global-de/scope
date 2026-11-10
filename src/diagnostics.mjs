import { lookup } from "node:dns/promises";
import { connect } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { dockerApiRequest } from "./monitoring.mjs";
import { resolveMonitoringHost } from "./monitoring-config.mjs";
import { resolveConnection } from "./remote-config.mjs";
import { checkRemoteConnection } from "./remote-status.mjs";
import { checkUrl, parseHttpUrl } from "./status.mjs";

function timedStep(name, action) {
  const started = performance.now();
  return action().then((detail) => ({ name, status: "up", durationMs: Math.round(performance.now() - started), detail }))
    .catch((error) => ({ name, status: "down", durationMs: Math.round(performance.now() - started), detail: String(error?.message ?? error).slice(0, 180) }));
}

function tcpCheck(hostname, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: hostname, port });
    const timeout = setTimeout(() => socket.destroy(new Error("Connection timed out")), timeoutMs);
    socket.once("connect", () => { clearTimeout(timeout); socket.end(); resolve(`${hostname}:${port}`); });
    socket.once("error", (error) => { clearTimeout(timeout); reject(error); });
  });
}

function tlsCheck(hostname, port, timeoutMs, rejectUnauthorized = true) {
  return new Promise((resolve, reject) => {
    const socket = tlsConnect({ host: hostname, port, servername: hostname, rejectUnauthorized });
    const timeout = setTimeout(() => socket.destroy(new Error("TLS handshake timed out")), timeoutMs);
    socket.once("secureConnect", () => {
      clearTimeout(timeout);
      const certificate = socket.getPeerCertificate();
      socket.end();
      resolve(`${socket.getProtocol() ?? "TLS"} · ${certificate.valid_to ?? "certificate received"}`);
    });
    socket.once("error", (error) => { clearTimeout(timeout); reject(error); });
  });
}

export async function diagnoseUrl(value, {
  timeoutMs = 4000, lookupImpl = lookup, tcpImpl = tcpCheck, tlsImpl = tlsCheck, checkImpl = checkUrl, checkOptions = {}
} = {}) {
  const url = parseHttpUrl(value);
  if (!url) return { target: value, status: "down", steps: [{ name: "url", status: "down", durationMs: 0, detail: "Invalid HTTP(S) URL" }] };
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  const dns = await timedStep("dns", async () => (await lookupImpl(url.hostname, { all: true })).map((item) => item.address).join(", "));
  const steps = [dns];
  if (dns.status === "up") steps.push(await timedStep("tcp", () => tcpImpl(url.hostname, port, timeoutMs)));
  if (steps.at(-1).status === "up" && url.protocol === "https:") {
    steps.push(await timedStep("tls", () => tlsImpl(url.hostname, port, timeoutMs, checkOptions.rejectUnauthorized !== false)));
  }
  if (steps.at(-1).status === "up") {
    steps.push(await timedStep("http", async () => {
      const result = await checkImpl(url.toString(), { timeoutMs, ...checkOptions });
      if (result.status !== "up") throw new Error(result.detail);
      return result.detail;
    }));
  }
  return { target: url.toString(), status: steps.every((step) => step.status === "up") ? "up" : "down", steps };
}

export async function diagnoseServer(server, {
  timeoutMs = 4000, lookupImpl = lookup, dockerImpl = dockerApiRequest, remoteImpl = checkRemoteConnection
} = {}) {
  const hostname = server.monitoring?.connection?.hostname ?? server.remote?.parameters?.hostname;
  const steps = [];
  if (hostname) steps.push(await timedStep("dns", async () => (await lookupImpl(hostname, { all: true })).map((item) => item.address).join(", ")));
  if (server.monitoring) {
    steps.push(await timedStep(server.monitoring.connection.type === "tls" ? "docker-tls" : "docker", async () => {
      const host = resolveMonitoringHost({ id: server.id, name: server.name, connection: server.monitoring.connection });
      const version = await dockerImpl(host.connection, "/version", { timeoutMs });
      return `Docker ${version?.Version ?? "API reachable"}`;
    }));
  }
  if (server.remote) {
    steps.push(await timedStep(server.remote.protocol, async () => {
      const result = await remoteImpl(resolveConnection({ ...server.remote, id: server.id, name: server.name }), { timeoutMs });
      if (result.status !== "up") throw new Error(result.detail);
      return result.detail;
    }));
  }
  return { target: server.id, status: steps.length && steps.every((step) => step.status === "up") ? "up" : "down", steps };
}
