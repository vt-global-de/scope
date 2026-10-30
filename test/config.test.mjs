import assert from "node:assert/strict";
import test from "node:test";
import { parseConfigText, validateConfig } from "../src/config.mjs";

test("defaults services without a type to links", () => {
  const config = {
    title: "Test",
    groups: [{ name: "Tools", items: [{ name: "GitLab", url: "https://gitlab.example.com" }] }]
  };
  assert.equal(validateConfig(config), config);
});

test("accepts multiple collapsible panels", () => {
  const config = {
    title: "Test",
    groups: [{
      name: "Tools",
      panels: [
        { name: "Core", items: [{ name: "GitLab", url: "https://gitlab.example.com" }] },
        { name: "Archive", collapsed: true, items: [] }
      ]
    }]
  };
  assert.equal(validateConfig(config), config);
});

test("validates stable panel identifiers and default widths", () => {
  const config = {
    title: "Test",
    groups: [{ name: "Tools", panels: [{ id: "core", name: "Core", layout: { width: "medium" }, items: [] }] }]
  };
  assert.equal(validateConfig(config), config);
  config.groups[0].panels[0].layout.width = "xsmall";
  assert.equal(validateConfig(config), config);
  config.groups[0].panels[0].layout.width = "giant";
  assert.throws(() => validateConfig(config), /xsmall, small, medium, large oder full/);
});

test("rejects unsupported widget types", () => {
  assert.throws(
    () => validateConfig({ title: "Test", groups: [{ name: "Tools", items: [{ type: "traefik" }] }] }),
    /noch nicht unterstützt/
  );
});

test("keeps an invalid URL so the UI can mark it as down", () => {
  const config = { title: "Test", groups: [{ name: "Tools", items: [{ name: "Bad", url: "not a url" }] }] };
  assert.equal(validateConfig(config), config);
});

test("validates tags and configured favorites", () => {
  const config = {
    title: "Test",
    groups: [{ name: "Tools", items: [{ name: "GitLab", tags: ["critical", "git"], favorite: true }] }]
  };
  assert.equal(validateConfig(config), config);
  assert.throws(() => validateConfig({
    title: "Test",
    groups: [{ name: "Tools", items: [{ name: "Bad", tags: ["same", "same"] }] }]
  }), /doppelte Werte/);
});

test("validates dashboard scope on individual services", () => {
  const config = {
    title: "Test",
    groups: [{ name: "Tools", items: [{ name: "GitLab", url: "https://gitlab.example.com", scope: "ignore" }] }]
  };
  assert.equal(validateConfig(config), config);
  config.groups[0].items[0].scope = "sometimes";
  assert.throws(() => validateConfig(config), /scope muss include oder ignore/);
});

test("validates standalone server dependencies", () => {
  const config = { title: "Test", groups: [{ name: "Tools", items: [{ name: "GitLab", "depends-on": ["docker-01"] }] }] };
  assert.equal(validateConfig(config), config);
  config.groups[0].items[0]["depends-on"] = ["Bad ID"];
  assert.throws(() => validateConfig(config), /gültiger Server-IDs/);
});

test("parses YAML configuration", () => {
  const config = parseConfigText("title: Test\ngroups: []\n", "config.yaml");
  assert.deepEqual(config, { title: "Test", groups: [] });
});

test("rejects non-YAML configuration files", () => {
  assert.throws(() => parseConfigText('{"title":"Test"}', "config.json"), /ausschließlich \.yaml/);
});
