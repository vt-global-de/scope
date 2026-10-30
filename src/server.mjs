import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createCertificateChecker } from "./certificates.mjs";
import { createDatabase } from "./database.mjs";
import { createDnsChecker } from "./dns-checks.mjs";
import {
  categoryIdentifier, createInventoryConfigStore, inventoryCapabilities, inventoryCertificates, inventoryDnsChecks,
  toServersConfig, toServicesConfig
} from "./inventory-config.mjs";
import { createMonitoringCollector } from "./monitoring.mjs";
import { createMetricsRegistry } from "./metrics.mjs";
import { createNotificationIconPng } from "./notification-brand.mjs";
import { createNotificationDispatcher } from "./notification-dispatcher.mjs";
import { publicNotificationChannels, resolveNotificationChannel } from "./notifications-config.mjs";
import { sendTestNotification } from "./notifications.mjs";
import {
  createUserAuthenticator, hashPassword, sanitizePreferences, validateAccountCredentials, verifyPassword
} from "./user-auth.mjs";
import { resolveConnection, toPublicConnection } from "./remote-config.mjs";
import { createRemoteSessionManager } from "./remote-sessions.mjs";
import { checkRemoteConnection, createRemoteStatusChecker } from "./remote-status.mjs";
import { inventoryTargetIds, scopedTargetIds } from "./scope-targets.mjs";
import { toMonitoringConfig, toRemoteConfig } from "./servers-config.mjs";
import { createStatusChecker } from "./status.mjs";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicDir = resolve(rootDir, "public");
const xtermDir = resolve(rootDir, "node_modules/@xterm/xterm");
const xtermFitDir = resolve(rootDir, "node_modules/@xterm/addon-fit");
const noVncDir = resolve(process.env.NOVNC_PUBLIC_DIR ?? "/usr/share/novnc");
const inventoryConfigFile = resolve(process.env.INVENTORY_CONFIG_FILE ?? resolve(rootDir, "config/inventory.yaml"));
const host = process.env.HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const authRequired = process.env.REMOTE_AUTH_REQUIRED !== "false";
const userHeader = (process.env.REMOTE_USER_HEADER ?? "x-authentik-username").toLowerCase();
const remoteAccessRole = process.env.REMOTE_ACCESS_ROLE ?? "operator";
if (!["operator", "admin"].includes(remoteAccessRole)) throw new Error("REMOTE_ACCESS_ROLE muss operator oder admin sein.");
const rawPublicUrl = (process.env.SCOPE_PUBLIC_URL ?? "").trim();
let instanceUrl;
if (rawPublicUrl) {
  try {
    const parsed = new URL(rawPublicUrl);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
    parsed.search = "";
    parsed.hash = "";
    instanceUrl = parsed.toString().replace(/\/$/, "");
  } catch {
    throw new Error("SCOPE_PUBLIC_URL muss eine gültige HTTP- oder HTTPS-URL ohne Zugangsdaten sein.");
  }
}
const rawIconBaseUrl = (process.env.ICON_BASE_URL ?? "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons").trim();
const iconBaseUrl = rawIconBaseUrl.replace(/\/+$/, "");
let validIconBaseUrl = iconBaseUrl.startsWith("/") && !iconBaseUrl.startsWith("//");
if (!validIconBaseUrl) {
  try {
    validIconBaseUrl = new URL(iconBaseUrl).protocol === "https:";
  } catch {
    validIconBaseUrl = false;
  }
}
if (!validIconBaseUrl) throw new Error("ICON_BASE_URL muss ein relativer Pfad oder eine HTTPS-URL sein.");
const getInventory = createInventoryConfigStore(inventoryConfigFile);
const getValidatedInventory = async () => {
  return getInventory();
};
const getConfig = async () => {
  const inventory = await getInventory();
  return inventoryCapabilities(inventory).services
    ? toServicesConfig(inventory)
    : { title: inventory.title, subtitle: inventory.subtitle, groups: [] };
};
const getServersConfig = async () => {
  const inventory = await getInventory();
  return inventoryCapabilities(inventory).servers ? toServersConfig(inventory) : { servers: [] };
};
const getRemoteConfig = async () => toRemoteConfig(await getServersConfig());
const getMonitoringConfig = async () => toMonitoringConfig(await getServersConfig());
const packageInfo = JSON.parse(await readFile(resolve(rootDir, "package.json"), "utf8"));
const database = createDatabase();
const notificationIcon = createNotificationIconPng();
const notificationDispatcher = createNotificationDispatcher({ database, getInventory, instanceUrl });
const userAuthenticator = createUserAuthenticator(database);
const metrics = createMetricsRegistry({ version: packageInfo.version });
let shuttingDown = false;
let startupFailure;
const checkConcurrency = Number.parseInt(process.env.STATUS_CHECK_CONCURRENCY ?? "8", 10);
const sessions = createRemoteSessionManager({
  attachTimeoutMs: Number.parseInt(process.env.REMOTE_SESSION_ATTACH_TIMEOUT_MS ?? "30000", 10),
  maxDurationMs: Number.parseInt(process.env.REMOTE_SESSION_MAX_DURATION_MS ?? String(8 * 60 * 60 * 1000), 10),
  idleTimeoutMs: Number.parseInt(process.env.REMOTE_SESSION_IDLE_TIMEOUT_MS ?? String(15 * 60 * 1000), 10),
  maxSessions: Number.parseInt(process.env.REMOTE_SESSION_MAX_CONCURRENT ?? "4", 10)
});
const getStatuses = createStatusChecker(getConfig, {
  timeoutMs: Number.parseInt(process.env.STATUS_CHECK_TIMEOUT_MS ?? "4000", 10),
  ttlMs: Number.parseInt(process.env.STATUS_CACHE_TTL_MS ?? "30000", 10),
  concurrency: checkConcurrency
});
const remoteStatusOptions = {
  timeoutMs: Number.parseInt(process.env.REMOTE_STATUS_CHECK_TIMEOUT_MS ?? "3000", 10),
  concurrency: checkConcurrency
};
const getRemoteStatuses = createRemoteStatusChecker(getRemoteConfig, {
  ...remoteStatusOptions,
  ttlMs: Number.parseInt(process.env.REMOTE_STATUS_CACHE_TTL_MS ?? "30000", 10)
});
const getMonitoring = createMonitoringCollector(getMonitoringConfig, {
  timeoutMs: Number.parseInt(process.env.MONITORING_CHECK_TIMEOUT_MS ?? "15000", 10),
  ttlMs: Number.parseInt(process.env.MONITORING_CACHE_TTL_MS ?? "30000", 10),
  concurrency: checkConcurrency
});
const getCertificateStatuses = createCertificateChecker(async () => {
  const inventory = await getInventory();
  return inventoryCapabilities(inventory).certificates ? inventoryCertificates(inventory) : [];
}, {
  timeoutMs: Number.parseInt(process.env.CERTIFICATE_CHECK_TIMEOUT_MS ?? "5000", 10),
  ttlMs: Number.parseInt(process.env.CERTIFICATE_CACHE_TTL_MS ?? "30000", 10),
  concurrency: checkConcurrency
});
const getDnsStatuses = createDnsChecker(async () => {
  const inventory = await getInventory();
  return inventoryCapabilities(inventory).dns ? inventoryDnsChecks(inventory) : [];
}, {
  timeoutMs: Number.parseInt(process.env.DNS_CHECK_TIMEOUT_MS ?? "4000", 10),
  ttlMs: Number.parseInt(process.env.DNS_CACHE_TTL_MS ?? "30000", 10),
  concurrency: checkConcurrency
});

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

class HttpError extends Error {
  constructor(statusCode, message, { expose = false } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

function redirect(response, location) {
  response.writeHead(302, { Location: location, "Cache-Control": "no-store" });
  response.end();
}

function sendText(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(body);
}

function metricRoute(pathname) {
  return pathname
    .replace(/^\/api\/notifications\/[^/]+\/test$/, "/api/notifications/:id/test")
    .replace(/^\/api\/notifications\/[^/]+\/enabled$/, "/api/notifications/:id/enabled")
    .replace(/^\/api\/remote\/connections\/[^/]+\/launch$/, "/api/remote/connections/:id/launch")
    .replace(/^\/api\/remote\/sessions\/[^/]+\/diagnostics$/, "/api/remote/sessions/:id/diagnostics")
    .replace(/^\/api\/remote\/sessions\/[^/]+$/, "/api/remote/sessions/:id")
    .replace(/^\/api\/admin\/users\/[^/]+\/active$/, "/api/admin/users/:id/active");
}

export function requestOriginAllowed(request, publicUrl = instanceUrl) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  if (String(request.headers["sec-fetch-site"] ?? "").toLowerCase() === "cross-site") return false;
  const origin = request.headers.origin;
  if (!origin) return true;
  const trustProxy = process.env.TRUST_PROXY_HEADERS === "true";
  const forwardedHost = trustProxy ? String(request.headers["x-forwarded-host"] ?? "").split(",", 1)[0].trim() : "";
  const forwardedProto = trustProxy ? String(request.headers["x-forwarded-proto"] ?? "").split(",", 1)[0].trim() : "";
  const target = publicUrl
    ? new URL(publicUrl).origin
    : `${forwardedProto || (request.socket?.encrypted ? "https" : "http")}://${forwardedHost || request.headers.host}`;
  try { return new URL(origin).origin === target; } catch { return false; }
}

function requireMetricsAccess(request) {
  const expected = process.env.METRICS_BEARER_TOKEN;
  if (!expected) return;
  if (request.headers.authorization !== `Bearer ${expected}`) throw new HttpError(401, "Metrik-Zugriff verweigert.");
}

function remoteAddress(request) {
  return request.socket?.remoteAddress ?? "";
}

async function readJson(request, maximumBytes = 4096) {
  if (!String(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Content-Type application/json erforderlich.");
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maximumBytes) throw new HttpError(413, "Anfrage ist zu groß.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new HttpError(400, "Ungültige JSON-Anfrage.");
  }
}

async function authenticatedUser(request) {
  if (request.scopeUser !== undefined) return request.scopeUser;
  request.scopeUser = await userAuthenticator.user(request);
  return request.scopeUser;
}

async function getRequestUser(request) {
  const value = request.headers[userHeader];
  const username = Array.isArray(value) ? value[0] : value;
  if (typeof username === "string" && username.trim()) return username.trim();
  const user = await authenticatedUser(request);
  if (user) return user.username;
  if (!authRequired) return "anonymous";
  throw new HttpError(401, `Remote-Zugriff erfordert den Proxy-Header ${userHeader}.`);
}

async function getEnabledConnections() {
  const config = await getRemoteConfig();
  const connections = config.connections.filter((connection) => connection.enabled !== false);
  await database.syncConnections(connections);
  return connections;
}

async function launchConnection(connectionId, request) {
  const username = await getRequestUser(request);
  const connection = (await getEnabledConnections()).find((candidate) => candidate.id === connectionId);
  if (!connection) throw new HttpError(404, "Remote-Verbindung nicht gefunden.");
  const resolvedConnection = resolveConnection(connection);
  const targetStatus = await checkRemoteConnection(resolvedConnection, remoteStatusOptions);
  if (targetStatus.status === "down") throw new HttpError(409, `Remote-Ziel ist nicht erreichbar: ${targetStatus.detail}`);

  const session = await sessions.create(resolvedConnection, username);
  await database.recordLaunch({ connectionId, username, protocol: connection.protocol });
  await database.recordAudit({
    actor: username, action: "remote.launched", targetType: "connection", targetId: connectionId,
    detail: { protocol: connection.protocol }, remoteAddress: remoteAddress(request)
  });
  metrics.recordRemoteSession();
  return session;
}

async function persistStatuses(targetType, items, mapper = (item) => item) {
  const entries = items.map(mapper).filter(Boolean).map((entry) => ({
    targetType,
    targetId: String(entry.targetId ?? entry.id),
    name: entry.name ?? entry.id,
    status: entry.status,
    detail: entry.detail ?? entry.error ?? ""
  }));
  metrics.updateStatuses(targetType, entries);
  if (targetType === "monitoring") metrics.updateDockerHosts(items);
  if (targetType === "certificate") metrics.updateCertificates(items);
  try {
    const transitions = await database.recordStatuses(entries);
    metrics.setDatabaseUp(database.enabled);
    const inventory = await getInventory();
    if (inventoryCapabilities(inventory).notifications && transitions.length) {
      const included = scopedTargetIds(inventory, targetType);
      await notificationDispatcher.handle(transitions.filter((event) => included.has(event.targetId)));
    }
  } catch (error) {
    metrics.setDatabaseUp(false);
    console.error(`Statushistorie konnte nicht gespeichert werden: ${error.message}`);
  }
  return items;
}

async function recordStatusSnapshot() {
  const inventory = await getInventory();
  const capabilities = inventoryCapabilities(inventory);
  const checks = [];
  if (capabilities.services) checks.push(getStatuses().then((items) => persistStatuses("service", items)));
  if (capabilities.remote) checks.push(getRemoteStatuses().then((items) => persistStatuses("remote", items)));
  if (capabilities.monitoring) checks.push(getMonitoring().then((items) => persistStatuses("monitoring", items)));
  if (capabilities.certificates) checks.push(getCertificateStatuses().then((items) => persistStatuses("certificate", items)));
  if (capabilities.dns) checks.push(getDnsStatuses().then((items) => persistStatuses("dns", items)));
  await Promise.all(checks);
}

function resolveStaticFile(pathname) {
  if (pathname === "/vendor/xterm/xterm.mjs") return resolve(xtermDir, "lib/xterm.mjs");
  if (pathname === "/vendor/xterm/xterm.css") return resolve(xtermDir, "css/xterm.css");
  if (pathname === "/vendor/xterm-addon-fit/addon-fit.mjs") return resolve(xtermFitDir, "lib/addon-fit.mjs");
  if (pathname.startsWith("/vendor/novnc/")) {
    const filePath = resolve(noVncDir, pathname.slice("/vendor/novnc/".length));
    if (filePath === noVncDir || filePath.startsWith(`${noVncDir}${sep}`)) return filePath;
    return null;
  }
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(publicDir, `.${requestedPath}`);
  return filePath === publicDir || filePath.startsWith(`${publicDir}${sep}`) ? filePath : null;
}

async function serveStatic(pathname, response) {
  const filePath = resolveStaticFile(pathname);
  if (!filePath) {
    sendJson(response, 403, { error: "Zugriff verweigert" });
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=300",
      "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: https:; connect-src 'self' ws: wss:; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    });
    response.end(content);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendJson(response, 404, { error: "Nicht gefunden" });
      return;
    }
    throw error;
  }
}

export function buildServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (instanceUrl?.startsWith("https://")) response.setHeader("Strict-Transport-Security", "max-age=31536000");
    response.once("finish", () => metrics.recordRequest(request.method, metricRoute(url.pathname), response.statusCode));
    try {
      if (request.method === "GET" && url.pathname === "/metrics") {
        if (!metrics.enabled) throw new HttpError(404, "Metriken sind deaktiviert.");
        requireMetricsAccess(request);
        sendText(response, 200, metrics.render(), "text/plain; version=0.0.4; charset=utf-8");
        return;
      }
      if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/livez") {
        sendJson(response, 200, { status: "ok" });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/config/validation") {
        if (startupFailure) {
          sendJson(response, 200, { valid: false, file: "PostgreSQL", error: startupFailure });
          return;
        }
        try {
          await getValidatedInventory();
          sendJson(response, 200, { valid: true, file: inventoryConfigFile });
        } catch (error) {
          sendJson(response, 200, { valid: false, file: inventoryConfigFile, error: error.message });
        }
        return;
      }
      if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/notification-icon.png") {
        response.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": notificationIcon.length,
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(request.method === "HEAD" ? undefined : notificationIcon);
        return;
      }
      if ((request.method === "GET" || request.method === "HEAD")
        && ["/config-error.css", "/config-error.js", "/theme-init.js", "/i18n.mjs", "/favicon.svg"].includes(url.pathname)) {
        await serveStatic(url.pathname, response);
        return;
      }
      if (startupFailure) {
        if ((request.method === "GET" || request.method === "HEAD")
          && !["/healthz", "/readyz"].includes(url.pathname) && !url.pathname.startsWith("/api/")) {
          await serveStatic("/config-error.html", response);
          return;
        }
        throw new HttpError(503, startupFailure, { expose: true });
      }
      let inventory;
      try {
        inventory = await getValidatedInventory();
      } catch (error) {
        if ((request.method === "GET" || request.method === "HEAD")
          && !["/healthz", "/readyz"].includes(url.pathname) && !url.pathname.startsWith("/api/")) {
          await serveStatic("/config-error.html", response);
          return;
        }
        throw new HttpError(503, error.message, { expose: true });
      }
      const passwordAuthEnabled = inventory.authenticate === true;

      if ((request.method === "GET" || request.method === "HEAD") && ["/healthz", "/readyz"].includes(url.pathname)) {
        if (shuttingDown) throw new HttpError(503, "Scope wird beendet.", { expose: true });
        await database.health();
        sendJson(response, 200, { status: "ok", database: database.enabled ? "connected" : "disabled" });
        return;
      }
      if (url.pathname.startsWith("/api/") && !requestOriginAllowed(request)) {
        throw new HttpError(403, "Cross-Origin-Anfrage wurde abgelehnt.");
      }
      if (request.method === "GET" && url.pathname === "/api/auth/config") {
        const setupRequired = passwordAuthEnabled && await database.countUsers() === 0;
        sendJson(response, 200, {
          enabled: passwordAuthEnabled,
          setupRequired,
          title: inventory.title,
          subtitle: inventory.subtitle ?? ""
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/auth/setup") {
        if (!passwordAuthEnabled) throw new HttpError(404, "Anmeldung ist nicht aktiviert.");
        if (await database.countUsers() > 0) throw new HttpError(409, "Scope wurde bereits eingerichtet.");
        const body = await readJson(request);
        const username = String(body.username ?? "");
        if (body.password !== body.passwordConfirmation) throw new HttpError(400, "Die Passwörter stimmen nicht überein.");
        try { validateAccountCredentials(username, body.password); }
        catch (error) { throw new HttpError(400, error.message); }
        const displayName = String(body.displayName ?? "").trim().slice(0, 100) || username;
        const user = await database.createInitialUser({
          username: username.toLowerCase(), displayName, passwordHash: await hashPassword(body.password)
        });
        if (!user) throw new HttpError(409, "Scope wurde bereits eingerichtet.");
        const session = await userAuthenticator.startSession(user);
        await database.recordAudit({ actor: user.username, action: "user.initial_admin_created", targetType: "user", targetId: String(user.id), remoteAddress: remoteAddress(request) });
        response.setHeader("Set-Cookie", userAuthenticator.sessionCookie(session.token, request));
        sendJson(response, 201, { configured: true, user: session.user });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        if (!passwordAuthEnabled) throw new HttpError(404, "Anmeldung ist nicht aktiviert.");
        if (await database.countUsers() === 0) throw new HttpError(409, "Scope muss zuerst eingerichtet werden.");
        const body = await readJson(request);
        if (typeof body.username !== "string") throw new HttpError(400, "Benutzername fehlt.");
        if (typeof body.password !== "string") throw new HttpError(400, "Passwort fehlt.");
        const result = await userAuthenticator.authenticate(body.username, body.password, request);
        if (result.rateLimited) {
          response.setHeader("Retry-After", String(result.retryAfterSeconds));
          throw new HttpError(429, "Zu viele Anmeldeversuche. Bitte später erneut versuchen.");
        }
        if (!result.ok) throw new HttpError(401, "Passwort ist nicht korrekt.");
        response.setHeader("Set-Cookie", userAuthenticator.sessionCookie(result.token, request));
        sendJson(response, 200, { authenticated: true, user: result.user });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/auth/logout") {
        const user = await authenticatedUser(request);
        await userAuthenticator.invalidate(request);
        if (user) await database.recordAudit({ actor: user.username, action: "auth.logout", targetType: "user", targetId: String(user.id), remoteAddress: remoteAddress(request) });
        response.setHeader("Set-Cookie", userAuthenticator.expiredCookie(request));
        sendJson(response, 200, { authenticated: false });
        return;
      }
      if ((request.method === "GET" || request.method === "HEAD") && ["/login", "/login.html"].includes(url.pathname)) {
        if (!passwordAuthEnabled || await authenticatedUser(request)) redirect(response, "/");
        else await serveStatic("/login.html", response);
        return;
      }
      if ((request.method === "GET" || request.method === "HEAD")
        && ["/login.css", "/login.js", "/theme-init.js", "/i18n.mjs", "/favicon.svg"].includes(url.pathname)) {
        await serveStatic(url.pathname, response);
        return;
      }
      if (passwordAuthEnabled && !await authenticatedUser(request)) {
        if (url.pathname.startsWith("/api/")) throw new HttpError(401, "Anmeldung erforderlich.");
        redirect(response, "/login");
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/account") {
        const user = await authenticatedUser(request);
        if (!user) throw new HttpError(404, "Persönliche Konten sind nicht aktiviert.");
        sendJson(response, 200, { user: { username: user.username, displayName: user.displayName, role: user.role } });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/account/preferences") {
        const user = await authenticatedUser(request);
        if (!user) throw new HttpError(404, "Persönliche Konten sind nicht aktiviert.");
        sendJson(response, 200, { preferences: sanitizePreferences(await database.getUserPreferences(user.id)) });
        return;
      }
      if (request.method === "PUT" && url.pathname === "/api/account/preferences") {
        const user = await authenticatedUser(request);
        if (!user) throw new HttpError(404, "Persönliche Konten sind nicht aktiviert.");
        const body = await readJson(request, 600_000);
        const preferences = sanitizePreferences(body.preferences);
        await database.setUserPreferences(user.id, preferences);
        sendJson(response, 200, { preferences });
        return;
      }
      if (request.method === "PUT" && url.pathname === "/api/account/password") {
        const user = await authenticatedUser(request);
        if (!user) throw new HttpError(404, "Persönliche Konten sind nicht aktiviert.");
        const body = await readJson(request);
        const account = await database.findUserByUsername(user.username);
        if (!account || !await verifyPassword(body.currentPassword, account.passwordHash)) {
          throw new HttpError(401, "Das aktuelle Passwort ist nicht korrekt.");
        }
        try { validateAccountCredentials(user.username, body.newPassword); }
        catch (error) { throw new HttpError(400, error.message); }
        await database.updateUserPassword(user.id, await hashPassword(body.newPassword));
        await database.recordAudit({ actor: user.username, action: "user.password_changed", targetType: "user", targetId: String(user.id), remoteAddress: remoteAddress(request) });
        response.setHeader("Set-Cookie", userAuthenticator.expiredCookie(request));
        sendJson(response, 200, { changed: true, reauthenticationRequired: true });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/admin/users") {
        const user = await authenticatedUser(request);
        if (user?.role !== "admin") throw new HttpError(403, "Administratorrechte erforderlich.");
        sendJson(response, 200, { users: await database.listUsers() });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/admin/users") {
        const user = await authenticatedUser(request);
        if (user?.role !== "admin") throw new HttpError(403, "Administratorrechte erforderlich.");
        const body = await readJson(request);
        const username = String(body.username ?? "");
        try { validateAccountCredentials(username, body.password); }
        catch (error) { throw new HttpError(400, error.message); }
        if (await database.userExists(username)) throw new HttpError(409, "Der Benutzername ist bereits vergeben.");
        const displayName = String(body.displayName ?? "").trim().slice(0, 100) || username;
        const created = await database.createUser({
          username: username.toLowerCase(),
          displayName,
          passwordHash: await hashPassword(body.password),
          role: ["admin", "operator", "viewer"].includes(body.role) ? body.role : "viewer"
        });
        await database.recordAudit({ actor: user.username, action: "user.created", targetType: "user", targetId: String(created.id), detail: { username: created.username, role: created.role }, remoteAddress: remoteAddress(request) });
        sendJson(response, 201, { user: created });
        return;
      }
      const userActiveMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)\/active$/);
      if (request.method === "PUT" && userActiveMatch) {
        const user = await authenticatedUser(request);
        if (user?.role !== "admin") throw new HttpError(403, "Administratorrechte erforderlich.");
        if (String(user.id) === userActiveMatch[1]) throw new HttpError(409, "Das eigene Konto kann nicht deaktiviert werden.");
        const body = await readJson(request);
        if (typeof body.active !== "boolean") throw new HttpError(400, "active muss true oder false sein.");
        await database.setUserActive(userActiveMatch[1], body.active);
        await database.recordAudit({ actor: user.username, action: body.active ? "user.activated" : "user.deactivated", targetType: "user", targetId: userActiveMatch[1], remoteAddress: remoteAddress(request) });
        sendJson(response, 200, { updated: true });
        return;
      }

      const launchMatch = url.pathname.match(/^\/api\/remote\/connections\/([a-z0-9_-]+)\/launch$/);

      const notificationTestMatch = url.pathname.match(/^\/api\/notifications\/([a-z0-9_-]+)\/test$/);
      if (request.method === "POST" && notificationTestMatch) {
        const user = await authenticatedUser(request);
        if (user?.role !== "admin") throw new HttpError(403, "Administratorrechte erforderlich.");
        if (!inventoryCapabilities(inventory).notifications) throw new HttpError(404, "Benachrichtigungen sind nicht aktiviert.");
        const channel = resolveNotificationChannel(inventory.menu.notifications, notificationTestMatch[1]);
        if (!channel) throw new HttpError(404, "Benachrichtigungskanal nicht gefunden.");
        if (!channel.enabled) throw new HttpError(409, "Benachrichtigungskanal ist deaktiviert.");
        if (!channel.ready) {
          const missing = [...channel.missingVariables, ...channel.missingFields].join(", ");
          throw new HttpError(409, `Benachrichtigungskanal ist unvollständig: ${missing}`);
        }
        try {
          await sendTestNotification(channel, { appName: inventory.title || "Scope", instanceUrl });
        } catch (error) {
          throw new HttpError(502, `Testversand fehlgeschlagen: ${error.message}`, { expose: true });
        }
        await database.recordAudit({ actor: user.username, action: "notification.test", targetType: "channel", targetId: channel.id, remoteAddress: remoteAddress(request) });
        sendJson(response, 200, {
          sent: true,
          channel: { id: channel.id, name: channel.name, type: channel.type }
        });
        return;
      }

      const notificationEnabledMatch = url.pathname.match(/^\/api\/notifications\/([a-z0-9_-]+)\/enabled$/);
      if (request.method === "PUT" && notificationEnabledMatch) {
        const user = await authenticatedUser(request);
        if (user?.role !== "admin") throw new HttpError(403, "Administratorrechte erforderlich.");
        if (!inventoryCapabilities(inventory).notifications) throw new HttpError(404, "Benachrichtigungen sind nicht aktiviert.");
        const channel = resolveNotificationChannel(inventory.menu.notifications, notificationEnabledMatch[1]);
        if (!channel) throw new HttpError(404, "Benachrichtigungskanal nicht gefunden.");
        if (!channel.enabled) throw new HttpError(409, "Der Kanal ist im Inventory deaktiviert.");
        const body = await readJson(request);
        if (typeof body.enabled !== "boolean") throw new HttpError(400, "enabled muss true oder false sein.");
        const state = await database.setNotificationChannelEnabled(channel.id, body.enabled);
        await database.recordAudit({ actor: user.username, action: body.enabled ? "notification.enabled" : "notification.disabled", targetType: "channel", targetId: channel.id, remoteAddress: remoteAddress(request) });
        sendJson(response, 200, { updated: true, channelId: state.channelId, deliveryEnabled: state.enabled });
        return;
      }

      if (request.method === "POST" && launchMatch) {
        const localUser = await authenticatedUser(request);
        if (passwordAuthEnabled && !["admin", "operator"].includes(localUser?.role)) {
          throw new HttpError(403, "Operatorrechte für Remote-Zugriff erforderlich.");
        }
        if (remoteAccessRole === "admin" && localUser?.role !== "admin") {
          throw new HttpError(403, "Administratorrechte für Remote-Zugriff erforderlich.");
        }
        sendJson(response, 200, await launchConnection(launchMatch[1], request));
        return;
      }
      const closeMatch = url.pathname.match(/^\/api\/remote\/sessions\/([A-Za-z0-9_-]+)$/);
      if (request.method === "DELETE" && closeMatch) {
        const username = await getRequestUser(request);
        if (!sessions.close(closeMatch[1], username)) throw new HttpError(404, "Remote-Session nicht gefunden.");
        await database.recordAudit({ actor: username, action: "remote.closed", targetType: "session", targetId: closeMatch[1], remoteAddress: remoteAddress(request) });
        sendJson(response, 200, { closed: true });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/admin/maintenance") {
        const user = await authenticatedUser(request);
        if (user?.role !== "admin") throw new HttpError(403, "Administratorrechte erforderlich.");
        const body = await readJson(request);
        if (!['service', 'remote', 'monitoring', 'certificate', 'dns'].includes(body.targetType)) throw new HttpError(400, "Ungültiger Zieltyp.");
        if (typeof body.targetId !== "string" || !body.targetId.trim()) throw new HttpError(400, "targetId fehlt.");
        if (!inventoryTargetIds(inventory, body.targetType).has(body.targetId.trim())) throw new HttpError(400, "targetId verweist auf kein bekanntes Ziel.");
        const durationMinutes = Number.parseInt(body.durationMinutes, 10);
        if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080) throw new HttpError(400, "durationMinutes muss zwischen 1 und 10080 liegen.");
        const id = await database.createMaintenanceWindow({
          targetType: body.targetType, targetId: body.targetId.trim(), reason: String(body.reason ?? "").slice(0, 300),
          endsAt: new Date(Date.now() + durationMinutes * 60000), createdBy: user.username
        });
        await database.recordAudit({ actor: user.username, action: "maintenance.created", targetType: body.targetType, targetId: body.targetId, detail: { id, durationMinutes }, remoteAddress: remoteAddress(request) });
        sendJson(response, 201, { id });
        return;
      }
      const maintenanceMatch = url.pathname.match(/^\/api\/admin\/maintenance\/(\d+)$/);
      if (request.method === "DELETE" && maintenanceMatch) {
        const user = await authenticatedUser(request);
        if (user?.role !== "admin") throw new HttpError(403, "Administratorrechte erforderlich.");
        if (!await database.deleteMaintenanceWindow(maintenanceMatch[1])) throw new HttpError(404, "Wartungsfenster nicht gefunden.");
        await database.recordAudit({ actor: user.username, action: "maintenance.deleted", targetType: "maintenance", targetId: maintenanceMatch[1], remoteAddress: remoteAddress(request) });
        sendJson(response, 200, { deleted: true });
        return;
      }
      const diagnosticMatch = url.pathname.match(/^\/api\/remote\/sessions\/([A-Za-z0-9_-]+)\/diagnostics$/);
      if (request.method === "GET" && diagnosticMatch) {
        const username = await getRequestUser(request);
        const diagnostic = sessions.diagnostics(diagnosticMatch[1], username);
        if (!diagnostic) throw new HttpError(404, "Remote-Session nicht gefunden.");
        response.setHeader("Content-Disposition", `attachment; filename=scope-session-${diagnosticMatch[1].slice(0, 12)}.json`);
        sendJson(response, 200, diagnostic);
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.setHeader("Allow", "GET, HEAD, POST, PUT, DELETE");
        sendJson(response, 405, { error: "Methode nicht erlaubt" });
        return;
      }
      if (url.pathname === "/api/config") {
        sendJson(response, 200, await getConfig());
        return;
      }
      if (url.pathname === "/api/meta") {
        sendJson(response, 200, {
          name: inventory.title,
          title: inventory.title,
          subtitle: inventory.subtitle ?? "",
          menu: Object.fromEntries(
            Object.entries(inventory.menu).map(([name, section]) => [name, {
              subtitle: section.subtitle ?? "",
              navigationLabel: section["navigation-label"] ?? "Groups",
              groups: (section.groups ?? []).map((group) => ({
                id: group.id,
                name: group.name,
                categories: group.categories.map((category, categoryIndex) => ({
                  id: categoryIdentifier(category, categoryIndex),
                  name: category.name,
                  collapsed: category.collapsed === true,
                  layout: category.layout ?? {}
                }))
              }))
            }])
          ),
          version: packageInfo.version,
          iconBaseUrl,
          authenticationRequired: passwordAuthEnabled,
          capabilities: inventoryCapabilities(inventory)
        });
        return;
      }
      if (url.pathname === "/api/status") {
        const items = await getStatuses();
        await persistStatuses("service", items);
        sendJson(response, 200, { checkedAt: new Date().toISOString(), items });
        return;
      }
      if (url.pathname === "/api/remote/connections") {
        const connections = await getEnabledConnections();
        sendJson(response, 200, {
          authRequired,
          connections: connections.map(toPublicConnection)
        });
        return;
      }
      if (url.pathname === "/api/remote/status") {
        const items = await getRemoteStatuses();
        await persistStatuses("remote", items);
        sendJson(response, 200, { checkedAt: new Date().toISOString(), items });
        return;
      }
      if (url.pathname === "/api/monitoring") {
        await getRequestUser(request);
        const items = await getMonitoring();
        await persistStatuses("monitoring", items);
        sendJson(response, 200, { checkedAt: new Date().toISOString(), hosts: items });
        return;
      }
      if (url.pathname === "/api/certificates") {
        await getRequestUser(request);
        const items = await getCertificateStatuses();
        await persistStatuses("certificate", items);
        sendJson(response, 200, { checkedAt: new Date().toISOString(), items });
        return;
      }
      if (url.pathname === "/api/dns") {
        await getRequestUser(request);
        const items = await getDnsStatuses();
        await persistStatuses("dns", items);
        sendJson(response, 200, { checkedAt: new Date().toISOString(), items });
        return;
      }
      if (url.pathname === "/api/history") {
        sendJson(response, 200, await database.statusHistory({ limit: url.searchParams.get("limit") ?? 20 }));
        return;
      }
      if (url.pathname === "/api/notifications") {
        await getRequestUser(request);
        const channels = inventoryCapabilities(inventory).notifications
          ? publicNotificationChannels(inventory.menu.notifications)
          : [];
        const states = await database.getNotificationChannelStates(channels.map((channel) => channel.id));
        sendJson(response, 200, {
          channels: channels.map((channel) => ({
            ...channel,
            deliveryEnabled: channel.enabled && states[channel.id] !== false
          }))
        });
        return;
      }
      if (url.pathname === "/api/admin/notification-history") {
        const user = await authenticatedUser(request);
        if (user?.role !== "admin") throw new HttpError(403, "Administratorrechte erforderlich.");
        sendJson(response, 200, { deliveries: await database.notificationHistory({ limit: url.searchParams.get("limit") ?? 50 }) });
        return;
      }
      if (url.pathname === "/api/admin/maintenance") {
        const user = await authenticatedUser(request);
        if (user?.role !== "admin") throw new HttpError(403, "Administratorrechte erforderlich.");
        sendJson(response, 200, { windows: await database.listMaintenanceWindows({ activeOnly: url.searchParams.get("active") === "true" }) });
        return;
      }
      if (url.pathname === "/api/admin/audit") {
        const user = await authenticatedUser(request);
        if (user?.role !== "admin") throw new HttpError(403, "Administratorrechte erforderlich.");
        sendJson(response, 200, { events: await database.auditHistory({ limit: url.searchParams.get("limit") ?? 100 }) });
        return;
      }
      await serveStatic(url.pathname, response);
    } catch (error) {
      const statusCode = error.statusCode ?? 500;
      if (statusCode >= 500) {
        if (error.expose) console.warn(error.message);
        else console.error(error);
      }
      sendJson(response, statusCode, { error: statusCode >= 500 && !error.expose ? "Scope konnte die Anfrage nicht verarbeiten." : error.message });
    }
  });
  server.on("upgrade", async (request, socket, head) => {
    try {
      const inventory = await getValidatedInventory();
      const passwordAuthEnabled = inventory.authenticate === true;
      if (passwordAuthEnabled && !await authenticatedUser(request)) {
        socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        return;
      }
      sessions.handleUpgrade(request, socket, head, await getRequestUser(request));
    } catch {
      socket.destroy();
    }
  });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await database.initialize();
    await database.health();
    metrics.setDatabaseUp(database.enabled);
  } catch (error) {
    metrics.setDatabaseUp(false);
    startupFailure = `PostgreSQL konnte nicht vorbereitet werden: ${error.message}`;
    console.error(startupFailure);
  }
  let startupInventory;
  if (!startupFailure) {
    try {
      startupInventory = await getValidatedInventory();
    } catch (error) {
      console.error(`Scope startet mit ungültiger Konfiguration: ${error.message}`);
    }
  }
  if (startupInventory) {
    userAuthenticator.assertAvailable(startupInventory.authenticate === true);
    await getEnabledConnections();
  }
  if (!startupFailure) notificationDispatcher.start();

  const server = buildServer();
  server.listen(port, host, () => {
    console.log(`Scope läuft auf http://${host}:${port}`);
    console.log(`Inventory: ${inventoryConfigFile}`);
  });

  const configuredHistoryIntervalMs = Number.parseInt(process.env.STATUS_HISTORY_INTERVAL_MS ?? "60000", 10);
  const historyIntervalMs = Number.isInteger(configuredHistoryIntervalMs)
    ? Math.max(15000, configuredHistoryIntervalMs)
    : 60000;
  const historyJitterMs = Math.max(0, Number.parseInt(process.env.STATUS_HISTORY_JITTER_MS ?? "5000", 10) || 0);
  const maxBackoffMs = Math.max(historyIntervalMs, Number.parseInt(process.env.STATUS_HISTORY_MAX_BACKOFF_MS ?? "900000", 10) || 900000);
  let historyFailures = 0;
  let historyTimer;
  let lastPruneAt = 0;
  const scheduleHistory = (delay = 0) => {
    historyTimer = setTimeout(async () => {
      try {
        await recordStatusSnapshot();
        historyFailures = 0;
        if (Date.now() - lastPruneAt > 86_400_000) {
          await database.pruneHistory();
          lastPruneAt = Date.now();
        }
      } catch (error) {
        historyFailures += 1;
        console.error(`Statushistorie konnte nicht aktualisiert werden: ${error.message}`);
      }
      const backoff = Math.min(maxBackoffMs, historyIntervalMs * (2 ** Math.min(historyFailures, 6)));
      const jitter = Math.floor(Math.random() * (historyJitterMs + 1));
      scheduleHistory(backoff + jitter);
    }, delay);
    historyTimer.unref();
  };
  scheduleHistory();

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearTimeout(historyTimer);
    notificationDispatcher.close();
    sessions.closeAll();
    const forceExit = setTimeout(() => {
      console.error("Scope konnte nicht innerhalb des Shutdown-Zeitfensters beendet werden.");
      process.exit(1);
    }, 15000);
    forceExit.unref();
    await new Promise((resolveClose) => server.close(resolveClose));
    await database.close();
    clearTimeout(forceExit);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
