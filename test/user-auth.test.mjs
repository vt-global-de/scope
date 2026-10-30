import assert from "node:assert/strict";
import test from "node:test";
import {
  createUserAuthenticator, hashPassword, sanitizePreferences, validateAccountCredentials, verifyPassword
} from "../src/user-auth.mjs";

function request({ cookie = "", address = "127.0.0.1", forwardedProto } = {}) {
  return { headers: { cookie, ...(forwardedProto ? { "x-forwarded-proto": forwardedProto } : {}) }, socket: { remoteAddress: address } };
}

function fakeDatabase(passwordHash) {
  const sessions = new Map();
  return {
    enabled: true,
    async findUserByUsername(username) {
      return username === "admin" ? { id: 1, username: "admin", displayName: "Admin", role: "admin", passwordHash } : null;
    },
    async createUserSession({ tokenHash, userId, expiresAt }) { sessions.set(tokenHash, { userId, expiresAt }); },
    async findUserBySession(tokenHash) {
      return sessions.has(tokenHash) ? { id: 1, username: "admin", displayName: "Admin", role: "admin" } : null;
    },
    async deleteUserSession(tokenHash) { sessions.delete(tokenHash); }
  };
}

test("hashes and verifies passwords with scrypt", async () => {
  const hash = await hashPassword("correct horse battery", { salt: Buffer.alloc(16, 7), cost: 1024 });
  assert.equal(await verifyPassword("correct horse battery", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
  assert.doesNotMatch(hash, /correct horse battery/);
});

test("creates, resolves and invalidates a database session", async () => {
  const passwordHash = await hashPassword("correct horse battery", { cost: 1024 });
  const auth = createUserAuthenticator(fakeDatabase(passwordHash), { tokenFactory: () => "test-token" });
  const login = await auth.authenticate("admin", "correct horse battery", request());
  assert.equal(login.ok, true);
  const cookie = auth.sessionCookie(login.token, request()).split(";", 1)[0];
  assert.equal((await auth.user(request({ cookie }))).username, "admin");
  await auth.invalidate(request({ cookie }));
  assert.equal(await auth.user(request({ cookie })), null);
});

test("validates account credentials and preference fields", () => {
  assert.throws(() => validateAccountCredentials("x", "correct horse battery"), /Benutzername/);
  assert.throws(() => validateAccountCredentials("admin", "short"), /8–128/);
  assert.throws(() => validateAccountCredentials("admin", "only lowercase characters!"), /Großbuchstaben/);
  assert.throws(() => validateAccountCredentials("admin", "ONLY UPPERCASE CHARACTERS!"), /Kleinbuchstaben/);
  assert.throws(() => validateAccountCredentials("admin", "NoSpecialCharactersHere"), /Sonderzeichen/);
  assert.throws(() => validateAccountCredentials("admin", `Valid!${"a".repeat(123)}`), /8–128/);
  assert.doesNotThrow(() => validateAccountCredentials("admin", "Scope!Aa"));
  assert.doesNotThrow(() => validateAccountCredentials("admin", "Scope password!"));
  assert.deepEqual(sanitizePreferences({
    theme: "dark", language: "de", density: "compact", sidebar: "collapsed",
    favorites: { a: true },
    panelLayouts: { services: { "group:main": { cards: { "panel:core": { widths: { "card:git": "medium" } } } } } },
    ignored: "value"
  }), {
    theme: "dark", language: "de", density: "compact", sidebar: "collapsed", favorites: { a: true },
    panelLayouts: { services: { "group:main": { cards: { "panel:core": { widths: { "card:git": "medium" } } } } } }
  });
});

test("uses persistent login throttling when PostgreSQL is enabled", async () => {
  const passwordHash = await hashPassword("correct horse battery", { cost: 1024 });
  let failures = 0;
  const database = {
    ...fakeDatabase(passwordHash),
    async getLoginAttempt() { return null; },
    async recordLoginFailure() { failures += 1; return { blocked: failures >= 2, retryAfterSeconds: failures >= 2 ? 900 : 0 }; },
    async clearLoginAttempt() {},
    async recordAudit() {}
  };
  const auth = createUserAuthenticator(database, { maximumAttempts: 2 });
  assert.equal((await auth.authenticate("admin", "wrong password", request())).rateLimited, false);
  const blocked = await auth.authenticate("admin", "wrong password", request());
  assert.equal(blocked.rateLimited, true);
  assert.equal(blocked.retryAfterSeconds, 900);
});
