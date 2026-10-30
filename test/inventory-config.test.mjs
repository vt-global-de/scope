import assert from "node:assert/strict";
import test from "node:test";
import {
  inventoryCapabilities, inventoryCertificates, inventoryDnsChecks,
  toServersConfig, toServicesConfig, validateInventoryConfig
} from "../src/inventory-config.mjs";

const inventory = {
  version: 1,
  title: "Test Inventory",
  subtitle: "Test Control Plane",
  authenticate: true,
  menu: {
    services: { subtitle: "Configured test services.", "navigation-label": "Areas", groups: [{
      id: "development",
      name: "Development",
      categories: [{ id: "management", name: "Management", layout: { width: "medium" }, services: [{ type: "link", name: "Git", url: "https://git.example.test", certificates: true, dns: true }] }]
    }] },
    server: { subtitle: "Configured test servers.", "navigation-label": "Device groups", groups: [{
      id: "development",
      name: "Development",
      categories: [{ id: "infrastructure", name: "Infrastructure", layout: { width: "large" }, servers: [{
        id: "docker-01",
        name: "Docker 01",
        monitoring: { type: "docker", connection: { type: "socket" } },
        remote: { protocol: "ssh", parameters: { hostname: "docker-01", username: "root", password: "secret" } }
      }] }]
    }] },
    notifications: {
      channels: [{ id: "discord", name: "Discord", type: "discord", enabled: false, "webhook-url": "${DISCORD_WEBHOOK}" }]
    }
  }
};

test("derives all runtime views from one inventory", () => {
  assert.equal(validateInventoryConfig(inventory), inventory);
  assert.equal(toServicesConfig(inventory).subtitle, "Configured test services.");
  assert.equal(toServicesConfig(inventory).navigationLabel, "Areas");
  assert.equal(toServicesConfig(inventory).groups[0].panels[0].items[0].name, "Git");
  assert.deepEqual(toServicesConfig(inventory).groups[0].panels[0].layout, { width: "medium" });
  assert.equal(toServersConfig(inventory).servers[0].environment, "Development");
  assert.equal(toServersConfig(inventory).servers[0].category, "Infrastructure");
  assert.equal(toServersConfig(inventory).servers[0].categoryId, "infrastructure");
  assert.deepEqual(toServersConfig(inventory).servers[0].categoryLayout, { width: "large" });
  assert.deepEqual(inventoryCapabilities(inventory), {
    services: true, servers: true, certificates: true, dns: true, notifications: true,
    monitoring: true, remote: true
  });
});

test("supports collapsible categories inside groups", () => {
  const panelInventory = {
    version: 1,
    title: "Panels",
    menu: { services: { groups: [{
      id: "production",
      name: "Production",
      categories: [{ name: "Core", collapsed: true, services: [] }]
    }] } }
  };
  validateInventoryConfig(panelInventory);
  assert.equal(toServicesConfig(panelInventory).groups[0].panels[0].collapsed, true);
});

test("validates category identifiers and layout widths", () => {
  const quarterWidth = structuredClone(inventory);
  quarterWidth.menu.services.groups[0].categories[0].layout.width = "xsmall";
  assert.equal(validateInventoryConfig(quarterWidth), quarterWidth);

  const invalidWidth = structuredClone(inventory);
  invalidWidth.menu.services.groups[0].categories[0].layout.width = "giant";
  assert.throws(() => validateInventoryConfig(invalidWidth), /xsmall, small, medium, large oder full/);

  const duplicate = structuredClone(inventory);
  duplicate.menu.services.groups[0].categories.push({ id: "management", name: "Other", services: [] });
  assert.throws(() => validateInventoryConfig(duplicate), /innerhalb der Gruppe doppelt/);
});

test("inherits and merges defaults from menu, group and category", () => {
  const configured = {
    version: 1,
    title: "Defaults",
    menu: {
      services: {
        defaults: { certificates: true, dns: true, tags: ["service"] },
        groups: [{
          id: "production",
          name: "Production",
          defaults: { tags: ["production"], "depends-on": ["docker-01"] },
          categories: [{
            name: "Core",
            defaults: { tags: ["core"] },
            services: [{ name: "Git", url: "https://git.example.test", tags: ["critical"], dns: false }]
          }]
        }]
      },
      server: {
        defaults: { description: "Docker host", tags: ["docker"], monitoring: { connection: { type: "tls", port: 443 } } },
        groups: [{
          id: "production",
          name: "Production",
          defaults: { tags: ["production"] },
          categories: [{
            name: "Docker hosts",
            servers: [{ id: "docker-01", name: "Docker 01", monitoring: { connection: { hostname: "docker.example.test" } } }]
          }]
        }]
      }
    }
  };

  validateInventoryConfig(configured);
  const service = toServicesConfig(configured).groups[0].panels[0].items[0];
  const server = toServersConfig(configured).servers[0];
  assert.deepEqual(service.tags, ["service", "production", "core", "critical"]);
  assert.deepEqual(service["depends-on"], ["docker-01"]);
  assert.equal(service.certificates, true);
  assert.equal(service.dns, false);
  assert.deepEqual(server.tags, ["docker", "production"]);
  assert.deepEqual(server.monitoring.connection, { type: "tls", port: 443, hostname: "docker.example.test" });
});

test("rejects unknown fields inside defaults", () => {
  const configured = structuredClone(inventory);
  configured.menu.services.defaults = { certificatess: true };
  assert.throws(() => validateInventoryConfig(configured), /certificatess ist unbekannt/);
});

test("inherits dashboard scope from groups and allows target overrides", () => {
  const configured = structuredClone(inventory);
  configured.menu.services.groups[0].scope = "ignore";
  configured.menu.server.groups[0].scope = "ignore";
  configured.menu.server.groups[0].categories[0].servers[0].scope = "include";

  validateInventoryConfig(configured);

  assert.equal(toServicesConfig(configured).groups[0].panels[0].items[0].scope, "ignore");
  assert.equal(toServersConfig(configured).servers[0].scope, "include");
});

test("rejects unsupported dashboard scope values", () => {
  const configured = structuredClone(inventory);
  configured.menu.services.groups[0].scope = "sometimes";
  assert.throws(() => validateInventoryConfig(configured), /scope muss include oder ignore/);
});

test("accepts known server dependencies and rejects unknown IDs", () => {
  const configured = structuredClone(inventory);
  configured.menu.services.groups[0].categories[0].services[0]["depends-on"] = ["docker-01"];
  validateInventoryConfig(configured);
  configured.menu.services.groups[0].categories[0].services[0]["depends-on"] = ["missing"];
  assert.throws(() => validateInventoryConfig(configured), /unbekannten Server missing/);
});

test("rejects duplicate group IDs inside one menu section", () => {
  assert.throws(() => validateInventoryConfig({
    version: 1,
    title: "Duplicate",
    menu: { services: { groups: [
      { id: "same", name: "A", categories: [] },
      { id: "same", name: "B", categories: [] }
    ] } }
  }), /doppelt/);
});

test("menu feature flags override discovered menu capabilities", () => {
  const capabilities = inventoryCapabilities(inventory, { FEATURE_SERVICES_ENABLED: "false" });
  assert.equal(capabilities.services, false);
});

test("environment flags cannot enable menu sections absent from inventory", () => {
  const configured = structuredClone(inventory);
  delete configured.menu.notifications;
  assert.equal(inventoryCapabilities(configured, { FEATURE_NOTIFICATIONS_ENABLED: "true" }).notifications, false);
});

test("discovers embedded health capabilities from inventory objects", () => {
  const capabilities = inventoryCapabilities(inventory, {});
  assert.equal(capabilities.certificates, true);
  assert.equal(capabilities.dns, true);
});

test("derives service health checks and their card ownership", () => {
  const [certificate] = inventoryCertificates(inventory);
  const [dns] = inventoryDnsChecks(inventory);
  assert.equal(certificate.hostname, "git.example.test");
  assert.equal(certificate.port, 443);
  assert.deepEqual(certificate.owner, { kind: "service", groupIndex: 0, panelIndex: 0, itemIndex: 0 });
  assert.equal(dns.hostname, "git.example.test");
  assert.deepEqual(dns.owner, certificate.owner);
});

test("supports customized health checks on servers", () => {
  const configured = structuredClone(inventory);
  configured.menu.server.groups[0].categories[0].servers[0].certificates = { hostname: "docker-api.example.test", port: 8443 };
  configured.menu.server.groups[0].categories[0].servers[0].dns = { hostname: "docker.example.test", type: "AAAA" };
  validateInventoryConfig(configured);
  assert.equal(inventoryCertificates(configured).at(-1).port, 8443);
  assert.deepEqual(inventoryDnsChecks(configured).at(-1).owner, { kind: "server", id: "docker-01" });
});

test("rejects group-wide health check lists", () => {
  const configured = structuredClone(inventory);
  configured.menu.services.groups[0].dns = [];
  assert.throws(() => validateInventoryConfig(configured), /direkt am Service oder Server/);
});

test("rejects the legacy top-level environments schema", () => {
  assert.throws(() => validateInventoryConfig({
    version: 1,
    title: "Legacy",
    menu: {},
    environments: []
  }), /durch menu.services.groups/);
});

test("disabling servers also disables its monitoring and remote capabilities", () => {
  const capabilities = inventoryCapabilities(inventory, { FEATURE_SERVERS_ENABLED: "false" });
  assert.equal(capabilities.servers, false);
  assert.equal(capabilities.monitoring, false);
  assert.equal(capabilities.remote, false);
});

test("rejects invalid feature environment values", () => {
  assert.throws(
    () => inventoryCapabilities(inventory, { FEATURE_SERVICES_ENABLED: "yes" }),
    /FEATURE_SERVICES_ENABLED muss true oder false sein/
  );
});

test("validates app and menu subtitles", () => {
  const invalidAppSubtitle = structuredClone(inventory);
  invalidAppSubtitle.subtitle = true;
  assert.throws(() => validateInventoryConfig(invalidAppSubtitle), /subtitle muss ein Text/);

  const invalidMenuSubtitle = structuredClone(inventory);
  invalidMenuSubtitle.menu.server.subtitle = 42;
  assert.throws(() => validateInventoryConfig(invalidMenuSubtitle), /menu.server.subtitle muss ein Text/);
});

test("validates the top-level authentication flag", () => {
  const invalid = structuredClone(inventory);
  invalid.authenticate = "true";
  assert.throws(() => validateInventoryConfig(invalid), /authenticate muss true oder false/);
});

test("rejects misspelled inventory fields instead of silently ignoring them", () => {
  const invalid = structuredClone(inventory);
  invalid.menu.server.groups[0].categories[0].servers[0].favourite = true;
  assert.throws(() => validateInventoryConfig(invalid), /favourite ist unbekannt/);
});
