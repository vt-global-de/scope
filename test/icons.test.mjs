import assert from "node:assert/strict";
import test from "node:test";
import { defaultIconBaseUrl, iconFallback, iconSource } from "../public/icons.mjs";

test("resolves catalog slugs against the configured public icon base", () => {
  assert.equal(iconSource("gitlab"), `${defaultIconBaseUrl}/svg/gitlab.svg`);
  assert.equal(iconSource("home-assistant", "https://icons.example.test/"), "https://icons.example.test/svg/home-assistant.svg");
});

test("keeps text icons and supports local or explicit HTTPS images", () => {
  assert.equal(iconSource("GL"), null);
  assert.equal(iconSource("</>"), null);
  assert.equal(iconSource("/icons/custom.svg"), "/icons/custom.svg");
  assert.equal(iconSource("https://icons.example.test/custom.svg"), "https://icons.example.test/custom.svg");
  assert.equal(iconSource("http://icons.example.test/custom.svg"), null);
});

test("creates deterministic text fallbacks", () => {
  assert.equal(iconFallback("GL", "GitLab"), "GL");
  assert.equal(iconFallback("home-assistant", "Home Assistant"), "HA");
  assert.equal(iconFallback(undefined, "Scope Portal"), "SP");
});
