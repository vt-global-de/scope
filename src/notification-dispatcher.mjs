import { resolveNotificationChannel } from "./notifications-config.mjs";
import { sendStatusNotification } from "./notifications.mjs";
import { toServicesConfig } from "./inventory-config.mjs";

export function createNotificationDispatcher({
  database,
  getInventory,
  send = sendStatusNotification,
  schedule = setTimeout,
  cancel = clearTimeout,
  logger = console,
  instanceUrl
}) {
  const pending = new Map();
  const keyFor = (rule, event) => `${rule.id}:${event.targetType}:${event.targetId}`;
  let retryTimer;
  let flushPromise;

  async function deliverDirect(section, rule, event, appName) {
    const states = await database.getNotificationChannelStates(rule.channels);
    await Promise.all(rule.channels.map(async (channelId) => {
      const channel = resolveNotificationChannel(section, channelId);
      if (!channel?.enabled || !channel.ready || states[channelId] === false) return;
      try {
        await send(channel, event, { appName, instanceUrl });
      } catch (error) {
        logger.error(`Benachrichtigung über ${channel.name} fehlgeschlagen: ${error.message}`);
      }
    }));
  }

  async function queue(section, rule, event, appName) {
    if (!database.enabled || typeof database.enqueueNotification !== "function") {
      await deliverDirect(section, rule, event, appName);
      return;
    }
    const states = await database.getNotificationChannelStates(rule.channels);
    for (const channelId of rule.channels) {
      const channel = resolveNotificationChannel(section, channelId);
      if (!channel?.enabled || !channel.ready || states[channelId] === false) continue;
      const occurrence = event.observedAt ?? new Date().toISOString();
      await database.enqueueNotification({
        dedupeKey: `${rule.id}:${channelId}:${event.targetType}:${event.targetId}:${event.status}:${occurrence}`,
        channelId,
        payload: { ruleId: rule.id, appName, event: { ...event, observedAt: occurrence } }
      });
    }
    await flush();
  }

  async function performFlush() {
    if (!database.enabled || typeof database.pendingNotifications !== "function") return;
    const inventory = await getInventory();
    const section = inventory.menu.notifications;
    if (!section) return;
    for (const item of await database.pendingNotifications({ limit: 20 })) {
      const channel = resolveNotificationChannel(section, item.channelId);
      const states = await database.getNotificationChannelStates([item.channelId]);
      if (!channel?.enabled || !channel.ready || states[item.channelId] === false) {
        await database.markNotificationCancelled(item.id, "Channel disabled or incomplete");
        continue;
      }
      try {
        await send(channel, item.payload.event, {
          appName: item.payload.appName || inventory.title || "Scope", instanceUrl
        });
        await database.markNotificationDelivered(item.id);
      } catch (error) {
        await database.markNotificationFailed(item.id, error.message);
        logger.error(`Benachrichtigung über ${channel.name} fehlgeschlagen: ${error.message}`);
      }
    }
  }

  function flush() {
    if (!flushPromise) flushPromise = performFlush().finally(() => { flushPromise = undefined; });
    return flushPromise;
  }

  function staticMaintenance(section, event, now = Date.now()) {
    return (section["maintenance-windows"] ?? []).some((window) => {
      if (window["target-type"] !== event.targetType || window["target-id"] !== event.targetId) return false;
      const start = window.from ? Date.parse(window.from) : 0;
      const end = Date.parse(window.until);
      return Number.isFinite(end) && start <= now && end > now;
    });
  }

  async function dependencyUnavailable(inventory, event) {
    if (event.targetType !== "service" || event.status !== "down") return false;
    if (!inventory.menu.services) return false;
    const config = toServicesConfig(inventory);
    const item = config.groups.flatMap((group) => group.panels.flatMap((panel) =>
      panel.items.map((service) => ({ groupId: group.id, service }))
    )).find(({ groupId, service }) => `${groupId}:${service.id ?? service.url}`.slice(0, 240) === event.targetId)?.service;
    const dependencies = item?.["depends-on"] ?? [];
    if (!dependencies.length || typeof database.currentTargetStatuses !== "function") return false;
    const [monitoring, remote] = await Promise.all([
      database.currentTargetStatuses("monitoring", dependencies),
      database.currentTargetStatuses("remote", dependencies)
    ]);
    return dependencies.some((id) => monitoring[id] === "down" || remote[id] === "down");
  }

  async function handle(events) {
    if (!events.length) return;
    const inventory = await getInventory();
    const section = inventory.menu.notifications;
    if (!section) return;
    const rules = (section.rules ?? []).filter((rule) => rule.enabled !== false);

    for (const event of events) {
      const eventName = event.status === "down" ? "down" : event.previousStatus === "down" ? "recovered" : null;
      if (!eventName) continue;
      if (eventName === "recovered") {
        await database.cancelPendingNotifications?.(event.targetType, event.targetId, "down");
      }
      if (staticMaintenance(section, event) || await database.activeMaintenance?.(event.targetType, event.targetId)) continue;
      if (await dependencyUnavailable(inventory, event)) continue;
      for (const rule of rules) {
        const key = keyFor(rule, event);
        if (eventName === "recovered") {
          if (pending.has(key)) {
            cancel(pending.get(key));
            pending.delete(key);
            continue;
          }
          if (!rule.events.includes("recovered")) continue;
          await queue(section, rule, event, inventory.title || "Scope");
          continue;
        }

        if (!rule.events.includes("down")) continue;

        const delayMs = (rule["delay-seconds"] ?? 0) * 1000;
        if (delayMs === 0) {
          await queue(section, rule, event, inventory.title || "Scope");
          continue;
        }
        if (pending.has(key)) continue;
        const timer = schedule(() => {
          pending.delete(key);
          queue(section, rule, event, inventory.title || "Scope").catch((error) => {
            logger.error(`Verzögerte Benachrichtigung fehlgeschlagen: ${error.message}`);
          });
        }, delayMs);
        timer?.unref?.();
        pending.set(key, timer);
      }
    }
  }

  function close() {
    for (const timer of pending.values()) cancel(timer);
    pending.clear();
    if (retryTimer) clearInterval(retryTimer);
  }

  function start() {
    if (!database.enabled || retryTimer) return;
    flush().catch((error) => logger.error(`Notification-Outbox fehlgeschlagen: ${error.message}`));
    retryTimer = setInterval(() => flush().catch((error) => logger.error(`Notification-Outbox fehlgeschlagen: ${error.message}`)),
      Math.max(5000, Number.parseInt(process.env.NOTIFICATION_RETRY_INTERVAL_MS ?? "30000", 10) || 30000));
    retryTimer.unref?.();
  }

  return { handle, flush, start, close };
}
