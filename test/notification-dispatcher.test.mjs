import assert from "node:assert/strict";
import test from "node:test";
import { createNotificationDispatcher } from "../src/notification-dispatcher.mjs";

const channel = {
  id: "discord-primary", name: "Discord", type: "discord", enabled: true,
  "webhook-url": "https://discord.com/api/webhooks/1/token"
};

function inventory(delay = 0) {
  return {
    title: "Scope",
    menu: { notifications: {
      channels: [channel],
      rules: [{ id: "status", events: ["down", "recovered"], channels: [channel.id], "delay-seconds": delay }]
    } }
  };
}

const down = {
  targetType: "service", targetId: "prod:git", name: "Git",
  status: "down", previousStatus: "up", detail: "HTTP 503"
};

test("sends status changes only through runtime-enabled channels", async () => {
  const sent = [];
  let enabled = false;
  const dispatcher = createNotificationDispatcher({
    database: { async getNotificationChannelStates() { return { "discord-primary": enabled }; } },
    getInventory: async () => inventory(),
    instanceUrl: "https://scope.example.test",
    send: async (resolved, event, options) => sent.push({ resolved, event, options })
  });
  try {
    await dispatcher.handle([down]);
    assert.equal(sent.length, 0);
    enabled = true;
    await dispatcher.handle([down]);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].options.instanceUrl, "https://scope.example.test");
  } finally {
    dispatcher.close();
  }
});

test("cancels a delayed outage when the target recovers in time", async () => {
  const sent = [];
  let scheduled;
  let cancelled = false;
  const dispatcher = createNotificationDispatcher({
    database: { async getNotificationChannelStates() { return {}; } },
    getInventory: async () => inventory(60),
    send: async (...args) => sent.push(args),
    schedule(callback) { scheduled = callback; return 1; },
    cancel() { cancelled = true; scheduled = undefined; }
  });
  await dispatcher.handle([down]);
  await dispatcher.handle([{ ...down, status: "up", previousStatus: "down", detail: "HTTP 200" }]);
  assert.equal(cancelled, true);
  assert.equal(sent.length, 0);
  dispatcher.close();
});

test("persists deliveries in the outbox before sending", async () => {
  const queued = [];
  const delivered = [];
  const database = {
    enabled: true,
    async getNotificationChannelStates() { return {}; },
    async activeMaintenance() { return false; },
    async currentTargetStatuses() { return {}; },
    async enqueueNotification(item) { queued.push({ id: queued.length + 1, ...item }); return true; },
    async pendingNotifications() {
      return queued.map((item) => ({ id: item.id, channelId: item.channelId, payload: item.payload, attempts: 0 }));
    },
    async markNotificationDelivered(id) { delivered.push(id); queued.splice(queued.findIndex((item) => item.id === id), 1); },
    async markNotificationFailed() {}
  };
  const sent = [];
  const dispatcher = createNotificationDispatcher({
    database, getInventory: async () => inventory(), send: async (...args) => sent.push(args)
  });
  try {
    await dispatcher.handle([{ ...down, observedAt: "2026-10-17T12:00:00.000Z" }]);
    assert.equal(sent.length, 1);
    assert.deepEqual(delivered, [1]);
  } finally { dispatcher.close(); }
});

test("suppresses events covered by an inventory maintenance window", async () => {
  const configured = inventory();
  configured.menu.notifications["maintenance-windows"] = [{
    "target-type": "service", "target-id": down.targetId,
    from: "2020-01-01T00:00:00Z", until: "2999-01-01T00:00:00Z"
  }];
  const sent = [];
  const dispatcher = createNotificationDispatcher({
    database: { async getNotificationChannelStates() { return {}; } },
    getInventory: async () => configured,
    send: async (...args) => sent.push(args)
  });
  await dispatcher.handle([down]);
  assert.equal(sent.length, 0);
  dispatcher.close();
});
