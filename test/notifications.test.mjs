import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStatusNotification, buildTestNotification, sendDiscord, sendTestNotification
} from "../src/notifications.mjs";

test("posts a test notification to a Discord webhook", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url: String(url), options };
    return { ok: true, status: 204 };
  };

  await sendDiscord({ "webhook-url": "https://discord.com/api/webhooks/1/token" }, {
    subject: "Scope test",
    text: "Delivery works"
  }, fetchImpl);

  assert.equal(request.url, "https://discord.com/api/webhooks/1/token");
  assert.equal(request.options.method, "POST");
  const payload = JSON.parse(request.options.body);
  assert.deepEqual(payload.embeds[0].title, "Scope test");
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
});

test("builds red outage and green recovery presentations", () => {
  const event = {
    targetType: "service", targetId: "prod:git", name: "Git",
    status: "down", previousStatus: "up", detail: "HTTP 503"
  };
  const now = new Date("2026-10-16T10:00:00.000Z");
  const instanceUrl = "https://scope.example.test";
  const outage = buildStatusNotification(event, { appName: "Scope", now, instanceUrl });
  const recovery = buildStatusNotification({ ...event, status: "up", previousStatus: "down", detail: "HTTP 200" }, { appName: "Scope", now });

  assert.equal(outage.discord.color, 0xe5484d);
  assert.match(outage.discord.title, /🔴.*DOWN/);
  assert.match(outage.html, /#e5484d/);
  assert.match(outage.html, /cid:scope-notification-icon/);
  assert.match(outage.html, /https:\/\/scope\.example\.test/);
  assert.match(outage.text, /HTTP 503/);
  assert.equal(outage.brandIcon, true);
  assert.equal(outage.discord.url, instanceUrl);
  assert.equal(outage.discord.thumbnail, "attachment://scope-notification-icon.png");
  assert.equal(recovery.discord.color, 0x2fb344);
  assert.match(recovery.discord.title, /🟢.*RECOVERED/);
  assert.match(recovery.html, /#2fb344/);
});

test("builds a styled channel test message", () => {
  const message = buildTestNotification({ type: "discord", name: "Operations" }, {
    appName: "Scope",
    now: new Date("2026-10-16T10:00:00.000Z"),
    instanceUrl: "https://scope.example.test/"
  });
  assert.match(message.discord.title, /✅/);
  assert.equal(message.discord.fields[0].value, "Operations");
  assert.match(message.html, /Delivery test/);
  assert.equal(message.instanceUrl, "https://scope.example.test");
  assert.equal(message.discord.thumbnail, "attachment://scope-notification-icon.png");
});

test("attaches the Scope icon to branded Discord embeds", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url: String(url), options };
    return { ok: true, status: 204 };
  };
  const message = buildStatusNotification({
    targetType: "service", targetId: "prod:git", name: "Git",
    status: "down", previousStatus: "up", detail: "HTTP 503"
  }, { instanceUrl: "https://scope.example.test" });

  await sendDiscord({ "webhook-url": "https://discord.com/api/webhooks/1/token" }, message, fetchImpl);

  assert.equal(request.options.headers, undefined);
  assert.ok(request.options.body instanceof FormData);
  const payload = JSON.parse(request.options.body.get("payload_json"));
  assert.equal(payload.embeds[0].thumbnail.url, "attachment://scope-notification-icon.png");
  assert.equal(payload.embeds[0].url, "https://scope.example.test");
  const icon = request.options.body.get("files[0]");
  assert.equal(icon.type, "image/png");
  assert.ok(icon.size > 100);
});

test("rejects non-Discord and unencrypted webhook URLs", async () => {
  await assert.rejects(
    sendDiscord({ "webhook-url": "https://example.test/hook" }, { subject: "test", text: "test" }),
    /HTTPS-URL von discord.com/
  );
  await assert.rejects(
    sendDiscord({ "webhook-url": "http://discord.com/api/webhooks/1/token" }, { subject: "test", text: "test" }),
    /HTTPS-URL von discord.com/
  );
});

test("rejects unsupported notification channel types", async () => {
  await assert.rejects(sendTestNotification({ type: "unknown", name: "Unknown" }), /Nicht unterstützter/);
});
