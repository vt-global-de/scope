import { connect } from "node:net";
import { mapWithConcurrency } from "./check-runner.mjs";

function resolveProbeValue(value, environment) {
  const text = String(value ?? "");
  const reference = text.match(/^\$\{([A-Z][A-Z0-9_]*)\}$/);
  return reference ? environment[reference[1]] : text;
}

export function remoteProbeTarget(connection, environment = process.env) {
  return {
    hostname: resolveProbeValue(connection.parameters.hostname, environment),
    port: Number.parseInt(resolveProbeValue(connection.parameters.port ?? (connection.protocol === "rdp" ? 3389 : 22), environment), 10)
  };
}

export async function checkRemoteConnection(connection, { timeoutMs = 3000, environment = process.env, connectImpl = connect } = {}) {
  const { hostname, port } = remoteProbeTarget(connection, environment);
  if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535) {
    return { id: connection.id, name: connection.name, protocol: connection.protocol, status: "down", code: "invalid_target", detail: "Hostname oder Port ungültig" };
  }

  return new Promise((resolve) => {
    const socket = connectImpl({ host: hostname, port });
    let finished = false;
    const finish = (status, detail, code) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve({ id: connection.id, name: connection.name, protocol: connection.protocol, hostname, port, status, code, detail });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      if ((connection.probe ?? "tcp") === "tcp") {
        finish("up", `${hostname}:${port} ist erreichbar`, "reachable");
        return;
      }
      if (connection.protocol === "rdp") {
        socket.write(Buffer.from("030000130ee000000000000100080003000000", "hex"));
      }
    });
    socket.once("data", (data) => {
      if ((connection.probe ?? "tcp") !== "handshake") return;
      const valid = connection.protocol === "ssh"
        ? data.toString("ascii", 0, 4) === "SSH-"
        : data.length >= 4 && data[0] === 0x03 && data[1] === 0x00;
      finish(valid ? "up" : "down", valid
        ? `${connection.protocol.toUpperCase()}-Handshake erfolgreich`
        : `${connection.protocol.toUpperCase()}-Antwort ist ungültig`, valid ? "handshake_ok" : "handshake_invalid");
    });
    socket.once("timeout", () => finish("down", `${hostname}:${port}: Zeitüberschreitung`, "timeout"));
    socket.once("error", (error) => {
      const diagnostics = {
        ENOTFOUND: ["dns_failed", `DNS-Auflösung für ${hostname} fehlgeschlagen`],
        EAI_AGAIN: ["dns_temporary", `DNS-Auflösung für ${hostname} ist vorübergehend nicht verfügbar`],
        ECONNREFUSED: ["connection_refused", `${hostname}:${port} lehnt die Verbindung ab`],
        EHOSTUNREACH: ["host_unreachable", `${hostname}:${port} ist über keine Route erreichbar`],
        ENETUNREACH: ["network_unreachable", `Das Netzwerk von ${hostname}:${port} ist nicht erreichbar`]
      };
      const [code, detail] = diagnostics[error?.code] ?? ["connection_failed", `${hostname}:${port}: ${error?.message || "nicht erreichbar"}`];
      finish("down", detail, code);
    });
  });
}

export function createRemoteStatusChecker(getRemoteConfig, options = {}) {
  const ttlMs = options.ttlMs ?? 30000;
  let cachedResults;
  let cachedAt = 0;
  let cachedSignature = "";
  let pendingCheck;

  return async function getRemoteStatuses() {
    const config = await getRemoteConfig();
    const connections = config.connections.filter((connection) => connection.enabled !== false);
    const signature = JSON.stringify(connections.map((connection) => ({ ...remoteProbeTarget(connection), probe: connection.probe ?? "tcp" })));
    const now = Date.now();
    if (cachedResults && signature === cachedSignature && now - cachedAt < ttlMs) return cachedResults;
    if (pendingCheck && signature === cachedSignature) return pendingCheck;

    cachedSignature = signature;
    const currentCheck = mapWithConcurrency(connections, options.concurrency ?? 8,
      (connection) => checkRemoteConnection(connection, options));
    pendingCheck = currentCheck;
    try {
      const results = await currentCheck;
      if (signature === cachedSignature) {
        cachedResults = results;
        cachedAt = Date.now();
      }
      return results;
    } finally {
      if (pendingCheck === currentCheck) pendingCheck = undefined;
    }
  };
}
