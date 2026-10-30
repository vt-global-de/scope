import { randomBytes } from "node:crypto";
import { access, mkdir } from "node:fs/promises";
import { createServer as createTcpServer, connect as connectTcp } from "node:net";
import { spawn } from "node:child_process";
import { createFreeRdpInvocation } from "./freerdp.mjs";
import { acceptWebSocket } from "./websocket.mjs";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const usedDisplays = new Set();

class RemoteSessionError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.statusCode = statusCode;
    this.expose = true;
  }
}

async function freeDisplay() {
  for (let attempt = 0; attempt < 900; attempt += 1) {
    const display = 100 + Math.floor(Math.random() * 800);
    if (usedDisplays.has(display)) continue;
    try { await access(`/tmp/.X11-unix/X${display}`); } catch {
      usedDisplays.add(display);
      return display;
    }
  }
  throw new Error("Kein freier virtueller Bildschirm verfügbar.");
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createTcpServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForPort(port, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const connected = await new Promise((resolve) => {
      const socket = connectTcp(port, "127.0.0.1");
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => resolve(false));
    });
    if (connected) return;
    await wait(100);
  }
  throw new Error("Remote-Gateway wurde nicht rechtzeitig bereit.");
}

async function freeRdpCommand() {
  const configured = process.env.FREERDP_COMMAND;
  if (configured) return configured;
  for (const candidate of ["/usr/bin/xfreerdp3", "/usr/bin/xfreerdp"]) {
    try { await access(candidate); return candidate; } catch { /* Try next binary. */ }
  }
  throw new Error("FreeRDP ist im Scope-Container nicht installiert.");
}

function monitoredSpawn(command, args, options, session) {
  const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], ...options });
  child.stdin.on("error", () => {});
  session.processes.add(child);
  child.once("exit", () => session.processes.delete(child));
  const captureDiagnostic = (chunk) => {
    const message = chunk.toString("utf8").trim();
    if (!message) return;
    session.lastErrors ??= [];
    session.lastErrors.push(message);
    session.lastErrors = session.lastErrors.join("\n").slice(-4000).split("\n");
    session.lastError = message.slice(-1000);
  };
  child.stdout.on("data", captureDiagnostic);
  child.stderr.on("data", captureDiagnostic);
  child.on("error", (error) => { session.lastError = error.message; });
  return child;
}

function safeDiagnostic(session, fallback) {
  const password = String(session.connection.parameters.password ?? "");
  return String(session.lastErrors?.join("\n") || session.lastError || fallback)
    .replaceAll(password, password ? "[redacted]" : "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(-800);
}

function stopSession(session) {
  clearTimeout(session.attachTimer);
  clearTimeout(session.expiryTimer);
  clearTimeout(session.idleTimer);
  for (const processHandle of session.processes) {
    try { processHandle.kill("SIGTERM"); } catch { /* Process has already exited. */ }
  }
  session.processes.clear();
  if (session.display !== undefined) usedDisplays.delete(session.display);
}

async function waitForEarlyExit(child, milliseconds) {
  if (child.exitCode !== null) return true;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.removeListener("exit", onExit);
      resolve(false);
    }, milliseconds);
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    child.once("exit", onExit);
  });
}

async function startRdp(session) {
  await mkdir("/tmp/scope", { recursive: true });
  const parameters = session.connection.parameters;
  const display = await freeDisplay();
  session.display = display;
  const vncPort = await freePort();
  const websocketPort = await freePort();
  const width = Number.parseInt(parameters.width ?? "1440", 10);
  const height = Number.parseInt(parameters.height ?? "900", 10);
  const displayName = `:${display}`;
  const environment = { ...process.env, DISPLAY: displayName, HOME: "/tmp/scope" };

  const xvfbProcess = monitoredSpawn("Xvfb", [displayName, "-screen", "0", `${width}x${height}x24`, "-nolisten", "tcp"], { env: environment }, session);
  if (await waitForEarlyExit(xvfbProcess, 400)) throw new Error(`Xvfb: ${session.lastError || "Virtueller Bildschirm konnte nicht gestartet werden."}`);
  xvfbProcess.once("exit", () => session.close());

  const command = await freeRdpCommand();
  const invocation = createFreeRdpInvocation(parameters, width, height);
  const rdpProcess = monitoredSpawn(command, invocation.commandArguments, { env: environment }, session);
  rdpProcess.stdin.end(invocation.standardInput);
  if (await waitForEarlyExit(rdpProcess, 5000)) throw new Error(`FreeRDP: ${session.lastError || "RDP-Verbindung wurde vorzeitig beendet."}`);
  rdpProcess.once("exit", () => session.close());

  monitoredSpawn("x11vnc", [
    "-display", displayName, "-localhost", "-rfbport", String(vncPort),
    "-nopw", "-forever", "-shared", "-quiet", "-xrandr", "resize"
  ], { env: environment }, session);
  await waitForPort(vncPort);
  monitoredSpawn("websockify", [String(websocketPort), `127.0.0.1:${vncPort}`], { env: environment }, session);
  await waitForPort(websocketPort);
  session.websocketPort = websocketPort;
}

async function startSsh(session, request, socket, head, onEnd) {
  const nodePty = await import("node-pty");
  const parameters = session.connection.parameters;
  const args = [
    "-tt",
    "-p", parameters.port,
    "-o", `ConnectTimeout=${parameters["connect-timeout"] ?? "10"}`,
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=3",
    "-o", `StrictHostKeyChecking=${parameters["host-key-policy"] === "off" ? "no" : parameters["host-key-policy"] === "strict" ? "yes" : "accept-new"}`,
    "-o", `UserKnownHostsFile=${parameters["known-hosts-file"] ?? "/tmp/scope/known_hosts"}`
  ];
  const privateKeyFile = parameters["private-key-file"] ?? parameters["private-key"];
  if (privateKeyFile) args.push("-i", privateKeyFile);
  args.push("--", `${parameters.username}@${parameters.hostname}`);

  const hasPassword = Boolean(parameters.password);
  if (hasPassword) {
    args.splice(args.length - 2, 0,
      "-o", "PreferredAuthentications=keyboard-interactive,password",
      "-o", "PubkeyAuthentication=no",
      "-o", "NumberOfPasswordPrompts=1"
    );
  }
  const command = hasPassword ? "sshpass" : "ssh";
  const commandArgs = hasPassword ? ["-e", "ssh", ...args] : args;
  const environment = hasPassword ? { ...process.env, SSHPASS: parameters.password } : process.env;
  const ptyProcess = nodePty.spawn(command, commandArgs, {
    name: "xterm-256color",
    cols: 120,
    rows: 34,
    cwd: "/tmp/scope",
    env: { ...environment, TERM: "xterm-256color" }
  });
  session.processes.add(ptyProcess);
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    try { ptyProcess.kill("SIGTERM"); } catch { /* Process has already exited. */ }
    onEnd();
  };
  const websocket = acceptWebSocket(request, socket, head, {
    onData: (payload, _connection, opcode) => {
      session.touch();
      if (opcode === 0x1) {
        try {
          const message = JSON.parse(payload.toString("utf8"));
          const cols = Number.parseInt(message.cols, 10);
          const rows = Number.parseInt(message.rows, 10);
          if (message.type === "resize" && cols >= 20 && cols <= 500 && rows >= 5 && rows <= 300) {
            ptyProcess.resize(cols, rows);
          }
        } catch { /* Ignore invalid control messages. */ }
        return;
      }
      ptyProcess.write(payload.toString("utf8"));
    },
    onClose: finish
  });
  ptyProcess.onData((data) => websocket?.send(Buffer.from(data, "utf8")));
  ptyProcess.onExit(({ exitCode, signal }) => {
    session.processes.delete(ptyProcess);
    if (exitCode !== 0) console.warn(`SSH-Session ${session.id} fehlgeschlagen: Exitcode ${exitCode}, Signal ${signal}`);
    websocket?.sendText(`[Scope] SSH-Session beendet (${exitCode ?? "signal"}).\r\n`);
    websocket?.close();
    finish();
  });
}

function proxyRdp(request, socket, head, session, onEnd) {
  const upstream = connectTcp(session.websocketPort, "127.0.0.1", () => {
    const headers = Object.entries(request.headers)
      .filter(([name]) => name.toLowerCase() !== "host")
      .map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(", ") : value}`);
    upstream.write([`GET / HTTP/1.1`, `Host: 127.0.0.1:${session.websocketPort}`, ...headers, "\r\n"].join("\r\n"));
    if (head?.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
    socket.on("data", () => session.touch());
    upstream.on("data", () => session.touch());
  });
  const finish = () => { upstream.destroy(); onEnd(); };
  upstream.once("error", () => { socket.destroy(); finish(); });
  socket.once("close", finish);
  socket.once("error", finish);
}

export function createRemoteSessionManager({
  attachTimeoutMs = 30000,
  maxDurationMs = 8 * 60 * 60 * 1000,
  idleTimeoutMs = 15 * 60 * 1000,
  maxSessions = 4
} = {}) {
  const sessions = new Map();

  return {
    async create(connection, username) {
      if (sessions.size >= maxSessions) {
        throw new RemoteSessionError(`Es sind bereits ${maxSessions} Remote-Sitzungen aktiv.`, 429);
      }
      await mkdir("/tmp/scope", { recursive: true });
      const id = randomBytes(24).toString("base64url");
      const session = {
        id,
        username,
        connection,
        processes: new Set(),
        attached: false,
        createdAt: Date.now()
      };
      session.close = () => this.close(id);
      session.touch = () => {
        clearTimeout(session.idleTimer);
        session.lastActivityAt = Date.now();
        session.idleTimer = setTimeout(() => this.close(id), idleTimeoutMs);
      };
      sessions.set(id, session);
      session.attachTimer = setTimeout(() => this.close(id), attachTimeoutMs);
      session.expiryTimer = setTimeout(() => this.close(id), maxDurationMs);
      session.touch();
      try {
        if (connection.protocol === "rdp") await startRdp(session);
      } catch (error) {
        const diagnostic = safeDiagnostic(session, error.message);
        this.close(id);
        throw new RemoteSessionError(`RDP-Session konnte nicht gestartet werden: ${diagnostic}`);
      }
      return { id, protocol: connection.protocol, socketPath: `/api/remote/sessions/${id}/socket` };
    },

    diagnostics(id, username) {
      const session = sessions.get(id);
      if (!session || (username && session.username !== username)) return null;
      return {
        sessionId: session.id,
        connectionId: session.connection.id,
        connectionName: session.connection.name,
        protocol: session.connection.protocol,
        createdAt: new Date(session.createdAt).toISOString(),
        lastActivityAt: new Date(session.lastActivityAt ?? session.createdAt).toISOString(),
        attached: session.attached,
        diagnostic: safeDiagnostic(session, "No diagnostic messages recorded.")
      };
    },

    close(id, username) {
      const session = sessions.get(id);
      if (!session || (username && session.username !== username)) return false;
      sessions.delete(id);
      stopSession(session);
      return true;
    },

    handleUpgrade(request, socket, head, username) {
      const origin = request.headers.origin;
      try {
        if (!origin || new URL(origin).host !== request.headers.host) return socket.destroy();
      } catch {
        return socket.destroy();
      }
      const pathname = new URL(request.url, "http://localhost").pathname;
      const match = pathname.match(/^\/api\/remote\/sessions\/([A-Za-z0-9_-]+)\/socket$/);
      const session = match ? sessions.get(match[1]) : undefined;
      if (!session || session.attached || (username && session.username !== username)) return socket.destroy();
      session.attached = true;
      session.touch();
      clearTimeout(session.attachTimer);
      const onEnd = () => this.close(session.id);
      try {
        if (session.connection.protocol === "ssh") {
          startSsh(session, request, socket, head, onEnd).catch((error) => {
            console.error(`SSH-Session ${session.id} konnte nicht verbunden werden:`, error);
            socket.destroy();
            onEnd();
          });
        } else proxyRdp(request, socket, head, session, onEnd);
      } catch (error) {
        console.error(`Remote-Session ${session.id} konnte nicht verbunden werden:`, error);
        socket.destroy();
        onEnd();
      }
    },

    closeAll() {
      for (const id of sessions.keys()) this.close(id);
    }
  };
}
