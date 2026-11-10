import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "yaml";
import { mergeInventoryYaml, prepareDiscoveredService } from "../src/discovery-export.mjs";

test("merges discovered services without removing inventory comments", () => {
  const source = `# Scope instance\nversion: 1\ntitle: Scope\nmenu:\n  services:\n    groups:\n      - id: main # primary group\n        name: Main\n        categories:\n          - id: apps\n            name: Apps\n            services:\n              # manually maintained service\n              - id: existing\n                name: Existing\n                url: https://existing.example.test\n`;
  const output = mergeInventoryYaml(source, [{
    destination: { groupIndex: 0, categoryIndex: 0, groupId: "main", categoryId: "apps" },
    service: { id: "discovered", name: "Discovered", url: "https://discovered.example.test" }
  }]);

  assert.match(output, /# Scope instance/);
  assert.match(output, /# primary group/);
  assert.match(output, /# manually maintained service/);
  assert.equal(parse(output).menu.services.groups[0].categories[0].services.length, 2);
  assert.equal(mergeInventoryYaml(source, []), source);
});

test("exports reviewed service metadata into the selected category", () => {
  const source = `version: 1\nmenu:\n  services:\n    groups:\n      - id: main\n        name: Main\n        categories:\n          - id: apps\n            name: Apps\n            services: []\n`;
  const output = mergeInventoryYaml(source, [{
    destination: { groupIndex: 0, categoryIndex: 0, groupId: "main", categoryId: "apps" },
    service: {
      id: "authentik", name: "Authentik", description: "Identity provider",
      url: "https://auth.example.test", icon: "authentik"
    }
  }]);
  const [service] = parse(output).menu.services.groups[0].categories[0].services;
  assert.deepEqual(service, {
    id: "authentik", name: "Authentik", description: "Identity provider",
    url: "https://auth.example.test", icon: "authentik"
  });
  assert.ok(output.indexOf("id: authentik") < output.indexOf("name: Authentik"));
  assert.ok(output.indexOf("name: Authentik") < output.indexOf("description: Identity provider"));
  assert.ok(output.indexOf("description: Identity provider") < output.indexOf("url: https://auth.example.test"));
  assert.ok(output.indexOf("url: https://auth.example.test") < output.indexOf("icon: authentik"));
});

test("omits a discovered dependency already inherited from the destination", () => {
  const inventory = {
    menu: { services: { groups: [{
      id: "main", defaults: { "depends-on": ["docker-01"] },
      categories: [{ id: "apps", defaults: {}, services: [] }]
    }] } }
  };
  const destination = { groupIndex: 0, categoryIndex: 0 };
  assert.deepEqual(prepareDiscoveredService(inventory, destination, {
    url: "https://app.example.test", icon: "app", name: "App", id: "app",
    "depends-on": ["docker-01"]
  }), {
    id: "app", name: "App", url: "https://app.example.test", icon: "app"
  });
  assert.deepEqual(prepareDiscoveredService(inventory, destination, {
    id: "other", name: "Other", url: "https://other.example.test", "depends-on": []
  })["depends-on"], []);
});

test("creates a reviewed service category without replacing existing YAML", () => {
  const source = `# inventory\nversion: 1\nmenu:\n  services:\n    groups:\n      - id: development\n        name: Development\n        categories:\n          - id: management\n            name: Management\n            services: []\n`;
  const output = mergeInventoryYaml(source, [{
    destination: {
      groupIndex: 0, categoryIndex: null, groupId: "development",
      categoryId: "observability", categoryName: "Observability", isNew: true
    },
    service: { id: "grafana", name: "Grafana", url: "https://grafana.example.test", icon: "grafana" }
  }]);
  const parsed = parse(output);
  assert.match(output, /# inventory/);
  assert.equal(parsed.menu.services.groups[0].categories.length, 2);
  assert.deepEqual(parsed.menu.services.groups[0].categories[1], {
    id: "observability", name: "Observability",
    services: [{ id: "grafana", name: "Grafana", url: "https://grafana.example.test", icon: "grafana" }]
  });
});

test("creates a new service area and panel without replacing existing YAML", () => {
  const source = `# inventory\nversion: 1\nmenu:\n  services:\n    groups:\n      - id: development\n        name: Development\n        categories:\n          - id: management\n            name: Management\n            services: []\n`;
  const output = mergeInventoryYaml(source, [{
    destination: {
      groupIndex: null, categoryIndex: null,
      groupId: "laboratory", groupName: "Laboratory", isNewGroup: true,
      categoryId: "experiments", categoryName: "Experiments", isNew: true
    },
    service: { id: "demo", name: "Demo", url: "https://demo.example.test" }
  }]);
  const parsed = parse(output);
  assert.match(output, /# inventory/);
  assert.deepEqual(parsed.menu.services.groups[1], {
    id: "laboratory", name: "Laboratory",
    categories: [{
      id: "experiments", name: "Experiments",
      services: [{ id: "demo", name: "Demo", url: "https://demo.example.test" }]
    }]
  });
});
