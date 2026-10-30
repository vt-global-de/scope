import assert from "node:assert/strict";
import test from "node:test";
import { createNotificationIconPng } from "../src/notification-brand.mjs";

test("creates a valid square PNG for notification branding", () => {
  const icon = createNotificationIconPng(128);
  assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(icon.readUInt32BE(16), 128);
  assert.equal(icon.readUInt32BE(20), 128);
  assert.ok(icon.length > 100);
});
