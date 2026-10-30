import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const cookieName = "scope_session";
const usernamePattern = /^[a-zA-Z0-9._-]{3,64}$/;
const passwordMinimumLength = 8;
const passwordMaximumLength = 128;
const passwordLowercasePattern = /\p{Ll}/u;
const passwordUppercasePattern = /\p{Lu}/u;
const passwordSpecialCharacterPattern = /[\p{P}\p{S}]/u;

function digest(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function cookieValue(request, name) {
  const header = request.headers?.cookie;
  if (!header) return "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return "";
}

function secureRequest(request) {
  const trustProxy = process.env.TRUST_PROXY_HEADERS === "true";
  const forwarded = trustProxy
    ? String(request.headers?.["x-forwarded-proto"] ?? "").split(",", 1)[0].trim().toLowerCase()
    : "";
  const publicHttps = String(process.env.SCOPE_PUBLIC_URL ?? "").toLowerCase().startsWith("https://");
  return Boolean(request.socket?.encrypted) || forwarded === "https" || publicHttps;
}

export function validateAccountCredentials(username, password) {
  if (!usernamePattern.test(String(username ?? ""))) {
    throw new Error("Der Benutzername muss 3–64 Zeichen lang sein und darf nur Buchstaben, Zahlen, Punkt, Unterstrich und Bindestrich enthalten.");
  }
  const value = String(password ?? "");
  if (value.length < passwordMinimumLength || value.length > passwordMaximumLength
    || !passwordLowercasePattern.test(value) || !passwordUppercasePattern.test(value)
    || !passwordSpecialCharacterPattern.test(value)) {
    throw new Error("Das Passwort muss 8–128 Zeichen lang sein und Großbuchstaben, Kleinbuchstaben sowie mindestens ein Sonderzeichen enthalten.");
  }
}

export async function hashPassword(password, { salt = randomBytes(16), cost = 16384 } = {}) {
  const derived = await scrypt(String(password), salt, 64, { N: cost, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${cost}$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, cost, blockSize, parallelization, saltValue, expectedValue] = String(encoded).split("$");
  if (algorithm !== "scrypt" || !saltValue || !expectedValue) return false;
  try {
    const expected = Buffer.from(expectedValue, "base64url");
    const actual = await scrypt(String(password), Buffer.from(saltValue, "base64url"), expected.length, {
      N: Number(cost), r: Number(blockSize), p: Number(parallelization), maxmem: 64 * 1024 * 1024
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function sanitizePreferences(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};
  if (["dark", "light"].includes(input.theme)) result.theme = input.theme;
  if (["en", "de"].includes(input.language)) result.language = input.language;
  if (["comfortable", "compact"].includes(input.density)) result.density = input.density;
  if (["expanded", "collapsed"].includes(input.sidebar)) result.sidebar = input.sidebar;
  for (const key of ["favorites", "panelLayouts"]) {
    const candidate = input[key];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const serialized = JSON.stringify(candidate);
      if (serialized.length <= 256_000) result[key] = JSON.parse(serialized);
    }
  }
  return result;
}

export function createUserAuthenticator(database, {
  sessionTtlMs = Number.parseInt(process.env.AUTH_SESSION_TTL_MS ?? String(12 * 60 * 60 * 1000), 10),
  attemptWindowMs = 15 * 60 * 1000,
  maximumAttempts = 5,
  now = () => Date.now(),
  tokenFactory = () => randomBytes(32).toString("base64url")
} = {}) {
  const attempts = new Map();
  let dummyPasswordHash;

  function requestKey(request, username = "") {
    return digest(`${request.socket?.remoteAddress ?? "unknown"}:${String(username).toLowerCase()}`);
  }

  function cleanupAttempts() {
    const timestamp = now();
    for (const [key, record] of attempts) if (record.startedAt + attemptWindowMs <= timestamp) attempts.delete(key);
  }

  return {
    assertAvailable(enabled) {
      if (enabled && !database.enabled) throw new Error("authenticate ist aktiviert, aber DATABASE_URL fehlt.");
    },

    async authenticate(username, password, request) {
      cleanupAttempts();
      const key = requestKey(request, username);
      const timestamp = now();
      const persisted = await database.getLoginAttempt?.(key);
      if (persisted?.blockedUntil && persisted.blockedUntil.getTime() > timestamp) {
        return { ok: false, rateLimited: true, retryAfterSeconds: Math.ceil((persisted.blockedUntil.getTime() - timestamp) / 1000) };
      }
      const record = attempts.get(key);
      if (!database.enabled && record && record.count >= maximumAttempts && record.startedAt + attemptWindowMs > timestamp) {
        return { ok: false, rateLimited: true, retryAfterSeconds: Math.ceil((record.startedAt + attemptWindowMs - timestamp) / 1000) };
      }
      const user = usernamePattern.test(String(username ?? "")) ? await database.findUserByUsername(username) : null;
      const passwordHash = user?.passwordHash ?? await (dummyPasswordHash ??= hashPassword(randomBytes(24).toString("base64url")));
      const valid = await verifyPassword(password, passwordHash);
      if (!valid) {
        let rateLimit = { blocked: false, retryAfterSeconds: 0 };
        if (database.enabled) {
          rateLimit = await database.recordLoginFailure(key, { maximumAttempts, windowMs: attemptWindowMs });
        } else {
          const active = record && record.startedAt + attemptWindowMs > timestamp ? record : { count: 0, startedAt: timestamp };
          active.count += 1;
          attempts.set(key, active);
        }
        await database.recordAudit?.({
          actor: String(username || "unknown"), action: "auth.login_failed", targetType: "user",
          targetId: String(username || "unknown"), remoteAddress: request.socket?.remoteAddress ?? ""
        });
        return { ok: false, rateLimited: rateLimit.blocked, retryAfterSeconds: rateLimit.retryAfterSeconds };
      }
      attempts.delete(key);
      await database.clearLoginAttempt?.(key);
      const token = tokenFactory();
      await database.createUserSession({ tokenHash: digest(token), userId: user.id, expiresAt: new Date(timestamp + sessionTtlMs) });
      await database.recordAudit?.({
        actor: user.username, action: "auth.login", targetType: "user", targetId: String(user.id),
        remoteAddress: request.socket?.remoteAddress ?? ""
      });
      return { ok: true, token, user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } };
    },

    async startSession(user) {
      const token = tokenFactory();
      await database.createUserSession({ tokenHash: digest(token), userId: user.id, expiresAt: new Date(now() + sessionTtlMs) });
      return { token, user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } };
    },

    async user(request) {
      const token = cookieValue(request, cookieName);
      return token ? database.findUserBySession(digest(token)) : null;
    },

    async invalidate(request) {
      const token = cookieValue(request, cookieName);
      if (token) await database.deleteUserSession(digest(token));
    },

    sessionCookie(token, request) {
      const maxAge = Math.max(1, Math.floor(sessionTtlMs / 1000));
      return `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureRequest(request) ? "; Secure" : ""}`;
    },

    expiredCookie(request) {
      return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureRequest(request) ? "; Secure" : ""}`;
    }
  };
}
