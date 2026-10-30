import assert from "node:assert/strict";
import test from "node:test";
import { publicNotificationChannels, resolveNotificationChannel, validateNotificationConfig } from "../src/notifications-config.mjs";

const config = {
  channels: [
    {
      id: "smtp-primary", name: "SMTP", type: "smtp", enabled: true,
      hostname: "${NOTIFICATION_SMTP_HOSTNAME}", port: "${NOTIFICATION_SMTP_PORT}", secure: "${NOTIFICATION_SMTP_SECURE}",
      username: "${NOTIFICATION_SMTP_USERNAME}", password: "${NOTIFICATION_SMTP_PASSWORD}",
      from: "${NOTIFICATION_SMTP_FROM}", to: "${NOTIFICATION_SMTP_TO}"
    },
    {
      id: "discord-primary", name: "Discord", type: "discord", enabled: true,
      "webhook-url": "${NOTIFICATION_DISCORD_WEBHOOK_URL}"
    }
  ]
};

const smtpTransport = {
  NOTIFICATION_SMTP_HOSTNAME: "smtp.example.test",
  NOTIFICATION_SMTP_PORT: "587",
  NOTIFICATION_SMTP_SECURE: "false",
  NOTIFICATION_SMTP_FROM: "scope@example.test",
  NOTIFICATION_SMTP_TO: "ops@example.test"
};

test("derives configured notification readiness from referenced secrets", () => {
  const channels = publicNotificationChannels(config, {
    ...smtpTransport,
    NOTIFICATION_SMTP_USERNAME: "scope",
    NOTIFICATION_SMTP_PASSWORD: "secret"
  });

  assert.equal(channels[0].ready, true);
  assert.equal(channels[1].ready, false);
  assert.deepEqual(channels[1].missingVariables, ["NOTIFICATION_DISCORD_WEBHOOK_URL"]);
});

test("never exposes notification secrets", () => {
  const secret = "not-for-the-browser";
  const channels = publicNotificationChannels(config, {
    ...smtpTransport,
    NOTIFICATION_SMTP_USERNAME: "scope",
    NOTIFICATION_SMTP_PASSWORD: secret,
    NOTIFICATION_DISCORD_WEBHOOK_URL: secret
  });

  assert.equal(JSON.stringify(channels).includes(secret), false);
  assert.equal(channels.every((channel) => channel.ready), true);
});

test("resolves notification secrets only for server-side delivery", () => {
  const channel = resolveNotificationChannel(config, "smtp-primary", {
    ...smtpTransport,
    NOTIFICATION_SMTP_USERNAME: "scope",
    NOTIFICATION_SMTP_PASSWORD: "secret"
  });

  assert.equal(channel.ready, true);
  assert.equal(channel.username, "scope");
  assert.equal(channel.password, "secret");
  assert.equal(channel.hostname, "smtp.example.test");
  assert.equal(channel.port, 587);
  assert.equal(channel.secure, false);
  assert.equal(channel.from, "scope@example.test");
  assert.equal(channel.to, "ops@example.test");
  assert.equal(resolveNotificationChannel(config, "unknown", {}), null);
});

test("requires both SMTP credentials when authentication is configured", () => {
  const [smtp] = publicNotificationChannels(config, {
    ...smtpTransport,
    NOTIFICATION_SMTP_USERNAME: "scope"
  });

  assert.equal(smtp.ready, false);
  assert.deepEqual(smtp.missingVariables, ["NOTIFICATION_SMTP_PASSWORD"]);
});

test("returns only channels declared in the inventory", () => {
  const [discord] = publicNotificationChannels({ channels: [config.channels[1]] }, {
    NOTIFICATION_DISCORD_WEBHOOK_URL: "secret"
  });
  assert.equal(discord.type, "discord");
});

test("validates channel IDs and supported channel types", () => {
  assert.throws(() => validateNotificationConfig({ channels: [{ id: "Bad ID", name: "Bad", type: "smtp" }] }), /id ist ungültig/);
  assert.throws(() => validateNotificationConfig({ channels: [{ id: "slack", name: "Slack", type: "slack" }] }), /smtp oder discord/);
  assert.throws(() => validateNotificationConfig({ channels: [{ id: "smtp", name: "SMTP", type: "smtp", port: "587" }] }), /Portnummer oder eine Env-Referenz/);
  assert.throws(() => validateNotificationConfig({ channels: [{ id: "smtp", name: "SMTP", type: "smtp", secure: "false" }] }), /true, false oder eine Env-Referenz/);
});

test("reports missing or invalid SMTP transport variables", () => {
  const [missing] = publicNotificationChannels(config, {
    NOTIFICATION_SMTP_USERNAME: "scope",
    NOTIFICATION_SMTP_PASSWORD: "secret"
  });
  assert.deepEqual(missing.missingVariables, [
    "NOTIFICATION_SMTP_HOSTNAME", "NOTIFICATION_SMTP_FROM", "NOTIFICATION_SMTP_TO",
    "NOTIFICATION_SMTP_PORT", "NOTIFICATION_SMTP_SECURE"
  ]);

  const [invalid] = publicNotificationChannels(config, {
    ...smtpTransport,
    NOTIFICATION_SMTP_PORT: "invalid",
    NOTIFICATION_SMTP_SECURE: "yes",
    NOTIFICATION_SMTP_USERNAME: "scope",
    NOTIFICATION_SMTP_PASSWORD: "secret"
  });
  assert.deepEqual(invalid.missingFields, ["port", "secure"]);
  assert.equal(invalid.ready, false);
});

test("validates automatic notification rules and channel references", () => {
  assert.equal(validateNotificationConfig({
    ...config,
    rules: [{ id: "status", events: ["down", "recovered"], channels: ["smtp-primary"], "delay-seconds": 60 }]
  }).rules[0].id, "status");
  assert.throws(() => validateNotificationConfig({
    ...config,
    rules: [{ id: "status", events: ["down"], channels: ["missing"] }]
  }), /unbekannten Kanal missing/);
  assert.throws(() => validateNotificationConfig({
    ...config,
    rules: [{ id: "status", events: ["warning"], channels: ["smtp-primary"] }]
  }), /down und\/oder recovered/);
});

test("validates declarative maintenance windows", () => {
  const section = validateNotificationConfig({
    channels: [],
    "maintenance-windows": [{
      "target-type": "service", "target-id": "prod:git",
      from: "2026-10-17T20:00:00Z", until: "2026-10-17T22:00:00Z", reason: "Upgrade"
    }]
  });
  assert.equal(section["maintenance-windows"].length, 1);
  assert.throws(() => validateNotificationConfig({
    channels: [], "maintenance-windows": [{ "target-type": "service", "target-id": "prod:git", until: "later" }]
  }), /ISO-Zeitpunkt/);
});
