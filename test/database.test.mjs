import assert from "node:assert/strict";
import test from "node:test";
import { createDatabase } from "../src/database.mjs";

test("provides a no-op history API when PostgreSQL is intentionally disabled", async () => {
  const database = createDatabase("");
  assert.equal(database.enabled, false);
  await database.recordStatuses([{ targetType: "service", targetId: "one", status: "up" }]);
  assert.deepEqual(await database.statusHistory(), {
    summary: { total: 0, up: 0, down: 0 },
    events: [],
    targets: [],
    timeline: []
  });
});
