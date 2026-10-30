import {
  inventoryCertificates, inventoryDnsChecks, toServersConfig, toServicesConfig
} from "./inventory-config.mjs";

export function scopedTargetIds(inventory, targetType) {
  if (targetType === "service") {
    return new Set(toServicesConfig(inventory).groups.flatMap((group) => group.panels.flatMap((panel) =>
      panel.items.filter((item) => item.scope !== "ignore").map((item) => `${group.id}:${item.id ?? item.url}`.slice(0, 240))
    )));
  }
  if (["remote", "monitoring"].includes(targetType)) {
    return new Set(toServersConfig(inventory).servers
      .filter((server) => server.scope !== "ignore")
      .map((server) => String(server.id).slice(0, 240)));
  }
  const checks = targetType === "certificate" ? inventoryCertificates(inventory)
    : targetType === "dns" ? inventoryDnsChecks(inventory) : [];
  return new Set(checks.filter((check) => check.scope !== "ignore").map((check) => String(check.id).slice(0, 240)));
}

export function inventoryTargetIds(inventory, targetType) {
  if (targetType === "service") {
    return new Set(toServicesConfig(inventory).groups.flatMap((group) => group.panels.flatMap((panel) =>
      panel.items.map((item) => `${group.id}:${item.id ?? item.url}`.slice(0, 240))
    )));
  }
  if (targetType === "remote") {
    return new Set(toServersConfig(inventory).servers.filter((server) => server.remote).map((server) => String(server.id).slice(0, 240)));
  }
  if (targetType === "monitoring") {
    return new Set(toServersConfig(inventory).servers.filter((server) => server.monitoring).map((server) => String(server.id).slice(0, 240)));
  }
  const checks = targetType === "certificate" ? inventoryCertificates(inventory)
    : targetType === "dns" ? inventoryDnsChecks(inventory) : [];
  return new Set(checks.map((check) => String(check.id).slice(0, 240)));
}
