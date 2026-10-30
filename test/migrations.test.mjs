import assert from "node:assert/strict";
import test from "node:test";
import { migrations } from "../src/migrations.mjs";

test("database migrations are ordered and immutable by version", () => {
  assert.deepEqual(migrations.map((migration) => migration.version), [1, 2]);
  assert.equal(new Set(migrations.map((migration) => migration.version)).size, migrations.length);
  assert.ok(migrations.every((migration) => migration.name && typeof migration.up === "function"));
});
