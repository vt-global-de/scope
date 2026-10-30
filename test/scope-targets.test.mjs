import assert from "node:assert/strict";
import test from "node:test";
import { inventoryTargetIds, scopedTargetIds } from "../src/scope-targets.mjs";

const inventory = {
  version: 1,
  title: "Scope",
  menu: {
    services: { groups: [
      { id: "production", name: "Production", categories: [{ name: "Core", services: [
        { id: "git", name: "Git", url: "https://git.example.test", certificates: true, dns: true }
      ] }] },
      { id: "development", name: "Development", scope: "ignore", categories: [{ name: "Core", services: [
        { id: "dev", name: "Dev", url: "https://dev.example.test", certificates: true, dns: true }
      ] }] }
    ] },
    server: { groups: [
      { id: "production", name: "Production", categories: [{ name: "Hosts", servers: [
        { id: "prod-host", name: "Prod", monitoring: { connection: { type: "socket" } } }
      ] }] },
      { id: "development", name: "Development", scope: "ignore", categories: [{ name: "Hosts", servers: [
        { id: "dev-host", name: "Dev", monitoring: { connection: { type: "socket" } } }
      ] }] }
    ] }
  }
};

test("selects only targets included in the central scope", () => {
  assert.deepEqual([...scopedTargetIds(inventory, "service")], ["production:git"]);
  assert.deepEqual([...scopedTargetIds(inventory, "monitoring")], ["prod-host"]);
  assert.equal([...scopedTargetIds(inventory, "certificate")].some((id) => id.startsWith("development-")), false);
  assert.equal([...scopedTargetIds(inventory, "dns")].some((id) => id.startsWith("development-")), false);
});

test("lists all configurable maintenance targets independently of Scope inclusion", () => {
  assert.deepEqual([...inventoryTargetIds(inventory, "service")], ["production:git", "development:dev"]);
  assert.deepEqual([...inventoryTargetIds(inventory, "monitoring")], ["prod-host", "dev-host"]);
});
