import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasTranslation, supportedLocales, translate } from "../public/i18n.mjs";

test("defaults are available in English and German", () => {
  assert.deepEqual(supportedLocales, ["en", "de"]);
  assert.equal(translate("en", "configurationLoading"), "Loading configuration …");
  assert.equal(translate("de", "configurationLoading"), "Konfiguration wird geladen …");
  assert.equal(translate("en", "openProtocol", { protocol: "SSH" }), "Open SSH");
  assert.equal(translate("en", "auditActionInitialAdminCreated"), "Initial administrator created");
  assert.equal(translate("de", "auditActionInitialAdminCreated"), "Initialer Administrator erstellt");
  assert.equal(translate("de", "auditActorAndTarget", { actor: "admin", target: "Benutzer admin" }), "admin · Benutzer admin");
});

test("all statically referenced translation keys exist in both languages", async () => {
  const sources = await Promise.all([
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/login.js", import.meta.url), "utf8"),
    readFile(new URL("../public/login.html", import.meta.url), "utf8")
  ]);
  const keys = new Set();
  for (const source of sources) {
    for (const match of source.matchAll(/\bt\("([A-Za-z0-9]+)"/g)) keys.add(match[1]);
    for (const match of source.matchAll(/data-i18n(?:-aria-label|-content|-placeholder)?="([A-Za-z0-9]+)"/g)) keys.add(match[1]);
  }
  for (const key of keys) {
    for (const locale of supportedLocales) assert.equal(hasTranslation(locale, key), true, `${locale}.${key} fehlt`);
  }
});
