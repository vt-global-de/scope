import { readFile, stat } from "node:fs/promises";
import { validateCertificates } from "./certificates.mjs";
import { parseConfigText, validateConfig } from "./config.mjs";
import { validateDnsChecks } from "./dns-checks.mjs";
import { validateNotificationConfig } from "./notifications-config.mjs";
import { validateServersConfig } from "./servers-config.mjs";

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const serviceGroups = (inventory) => inventory.menu.services?.groups ?? [];
const serverGroups = (inventory) => inventory.menu.server?.groups ?? [];
const serviceDefaultKeys = [
  "type", "description", "icon", "tags", "favorite", "scope", "depends-on", "certificates", "dns"
];
const serverDefaultKeys = [
  "description", "tags", "favorite", "scope", "enabled", "monitoring", "remote", "certificates", "dns"
];
const panelWidths = new Set(["xsmall", "small", "medium", "large", "full"]);

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

export function categoryIdentifier(category, index) {
  if (category.id) return category.id;
  return category.name.toLocaleLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    || `category-${index + 1}`;
}

function validateCategoryLayout(category, path) {
  if (category.id !== undefined && (!isNonEmptyString(category.id) || !/^[a-z0-9][a-z0-9_-]*$/.test(category.id))) {
    throw new Error(`${path}.id ist ungültig.`);
  }
  if (category.layout === undefined) return;
  if (!isPlainObject(category.layout)) throw new Error(`${path}.layout muss ein Objekt sein.`);
  assertKnownKeys(category.layout, ["width"], `${path}.layout`);
  if (category.layout.width !== undefined && !panelWidths.has(category.layout.width)) {
    throw new Error(`${path}.layout.width muss xsmall, small, medium, large oder full sein.`);
  }
}

function mergeDefaults(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override ?? {})) {
    if (value === undefined) continue;
    if (key === "tags" && Array.isArray(value)) {
      result.tags = [...(result.tags ?? []), ...value].filter((tag, index, tags) =>
        tags.findIndex((candidate) => String(candidate).toLocaleLowerCase() === String(tag).toLocaleLowerCase()) === index
      );
    } else if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeDefaults(result[key], value);
    } else {
      result[key] = structuredClone(value);
    }
  }
  return result;
}

function effectiveTarget(section, group, category, target) {
  return [
    section?.defaults,
    group.scope ? { scope: group.scope } : undefined,
    group.defaults,
    category.defaults,
    target
  ].reduce(mergeDefaults, {});
}

function assertKnownKeys(value, allowed, path) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`${path}.${unknown[0]} ist unbekannt.`);
}

function checkOptions(value, path, kind) {
  if (value === undefined || value === false) return null;
  if (value === true) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} muss true, false oder ein Objekt sein.`);
  }
  const allowed = kind === "certificate"
    ? ["enabled", "id", "name", "hostname", "port", "warning-days", "server-name", "reject-unauthorized"]
    : ["enabled", "id", "name", "hostname", "type", "expected", "resolvers"];
  assertKnownKeys(value, allowed, path);
  if (value.enabled === false) return null;
  return value;
}

function serviceEntries(inventory) {
  const section = inventory.menu.services;
  return serviceGroups(inventory).flatMap((group, groupIndex) =>
    group.categories.flatMap((category, panelIndex) =>
      category.services.map((service, itemIndex) => ({
        group, groupIndex, panelIndex, itemIndex,
        service: effectiveTarget(section, group, category, service)
      }))
    )
  );
}

function serverEntries(inventory) {
  const section = inventory.menu.server;
  return serverGroups(inventory).flatMap((group, groupIndex) =>
    group.categories.flatMap((category, categoryIndex) =>
      category.servers.map((server, serverIndex) => ({
        group, groupIndex, category, categoryIndex, serverIndex,
        server: effectiveTarget(section, group, category, server)
      }))
    )
  );
}

function serviceUrl(service, path) {
  try {
    return new URL(service.url);
  } catch {
    throw new Error(`${path} benötigt eine gültige URL oder einen expliziten hostname.`);
  }
}

function serverHostname(server, options, path) {
  const hostname = options.hostname
    ?? server.monitoring?.connection?.hostname
    ?? server.remote?.parameters?.hostname;
  if (!isNonEmptyString(hostname)) throw new Error(`${path} benötigt einen expliziten hostname.`);
  return hostname;
}

function featureEnabled(environment, name, discovered) {
  const variable = `FEATURE_${name.toUpperCase()}_ENABLED`;
  const value = environment[variable];
  if (value === undefined || value === "") return discovered;
  const normalized = String(value).toLowerCase();
  if (!["true", "false"].includes(normalized)) throw new Error(`${variable} muss true oder false sein.`);
  return discovered && normalized === "true";
}

export function toServicesConfig(inventory) {
  return {
    title: inventory.title,
    subtitle: inventory.menu.services?.subtitle ?? "",
    navigationLabel: inventory.menu.services?.["navigation-label"] ?? "Groups",
    groups: serviceGroups(inventory).map((group) => ({
      id: group.id,
      name: group.name,
      panels: group.categories.map((category, categoryIndex) => ({
        id: categoryIdentifier(category, categoryIndex),
        name: category.name,
        collapsed: category.collapsed,
        layout: { width: category.layout?.width ?? "full" },
        items: category.services.map((service) => effectiveTarget(inventory.menu.services, group, category, service))
      }))
    }))
  };
}

export function toServersConfig(inventory) {
  return {
    navigationLabel: inventory.menu.server?.["navigation-label"] ?? "Groups",
    servers: serverEntries(inventory).map(({ group, category, categoryIndex, server }) => ({
      ...server,
      groupId: group.id,
      groupName: group.name,
      category: category.name,
      categoryId: categoryIdentifier(category, categoryIndex),
      categoryCollapsed: category.collapsed === true,
      categoryLayout: { width: category.layout?.width ?? "full" },
      environment: group.name
    }))
  };
}

export function inventoryCapabilities(inventory, environment = process.env) {
  const servers = toServersConfig(inventory).servers;
  const discovered = {
    services: inventory.menu.services !== undefined,
    servers: inventory.menu.server !== undefined,
    certificates: inventoryCertificates(inventory).length > 0,
    dns: inventoryDnsChecks(inventory).length > 0,
    notifications: inventory.menu.notifications !== undefined
  };
  const capabilities = Object.fromEntries(
    Object.entries(discovered).map(([name, available]) => [
      name,
      ["certificates", "dns"].includes(name) ? available : featureEnabled(environment, name, available)
    ])
  );
  capabilities.monitoring = capabilities.servers
    && servers.some((server) => server.monitoring && server.enabled !== false && server.monitoring.enabled !== false);
  capabilities.remote = capabilities.servers
    && servers.some((server) => server.remote && server.enabled !== false && server.remote.enabled !== false);
  return capabilities;
}

export function inventoryCertificates(inventory) {
  const serviceCertificates = serviceEntries(inventory).flatMap(({ group, groupIndex, panelIndex, itemIndex, service }) => {
    const path = `menu.services.groups[${groupIndex}].categories[${panelIndex}].services[${itemIndex}].certificates`;
    const options = checkOptions(service.certificates, path, "certificate");
    if (!options) return [];
    const url = options.hostname ? null : serviceUrl(service, path);
    if (url && url.protocol !== "https:") throw new Error(`${path}: certificates: true benötigt eine HTTPS-URL.`);
    return [{
      ...options,
      id: options.id ?? `${group.id}-service-${panelIndex}-${itemIndex}-tls`,
      name: options.name ?? `${service.name} TLS`,
      hostname: options.hostname ?? url.hostname,
      port: options.port ?? Number(url.port || 443),
      scope: service.scope,
      environment: group.name,
      owner: { kind: "service", groupIndex, panelIndex, itemIndex }
    }];
  });
  const serverCertificates = serverEntries(inventory).flatMap(({ group, groupIndex, categoryIndex, server, serverIndex }) => {
    const path = `menu.server.groups[${groupIndex}].categories[${categoryIndex}].servers[${serverIndex}].certificates`;
    const options = checkOptions(server.certificates, path, "certificate");
    if (!options || server.enabled === false) return [];
    const monitoringConnection = server.monitoring?.connection;
    return [{
      ...options,
      id: options.id ?? `${server.id}-certificate`,
      name: options.name ?? `${server.name} TLS`,
      hostname: serverHostname(server, options, path),
      port: options.port ?? (monitoringConnection?.type === "tls" ? monitoringConnection.port ?? 2376 : 443),
      scope: server.scope,
      environment: group.name,
      owner: { kind: "server", id: server.id }
    }];
  });
  return [...serviceCertificates, ...serverCertificates];
}

export function inventoryDnsChecks(inventory) {
  const serviceChecks = serviceEntries(inventory).flatMap(({ group, groupIndex, panelIndex, itemIndex, service }) => {
    const path = `menu.services.groups[${groupIndex}].categories[${panelIndex}].services[${itemIndex}].dns`;
    const options = checkOptions(service.dns, path, "dns");
    if (!options) return [];
    const url = options.hostname ? null : serviceUrl(service, path);
    return [{
      ...options,
      id: options.id ?? `${group.id}-service-${panelIndex}-${itemIndex}-dns`,
      name: options.name ?? `${service.name} DNS`,
      hostname: options.hostname ?? url.hostname,
      type: options.type ?? "A",
      scope: service.scope,
      environment: group.name,
      owner: { kind: "service", groupIndex, panelIndex, itemIndex }
    }];
  });
  const serverChecks = serverEntries(inventory).flatMap(({ group, groupIndex, categoryIndex, server, serverIndex }) => {
    const path = `menu.server.groups[${groupIndex}].categories[${categoryIndex}].servers[${serverIndex}].dns`;
    const options = checkOptions(server.dns, path, "dns");
    if (!options || server.enabled === false) return [];
    return [{
      ...options,
      id: options.id ?? `${server.id}-dns`,
      name: options.name ?? `${server.name} DNS`,
      hostname: serverHostname(server, options, path),
      type: options.type ?? "A",
      scope: server.scope,
      environment: group.name,
      owner: { kind: "server", id: server.id }
    }];
  });
  return [...serviceChecks, ...serverChecks];
}

export function validateInventoryConfig(inventory) {
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    throw new Error("Das Inventory muss ein Objekt sein.");
  }
  if (inventory.version !== 1) throw new Error("version muss 1 sein.");
  if (!isNonEmptyString(inventory.title)) throw new Error("title muss gesetzt sein.");
  if (inventory.authenticate !== undefined && typeof inventory.authenticate !== "boolean") {
    throw new Error("authenticate muss true oder false sein.");
  }
  if (inventory.subtitle !== undefined && typeof inventory.subtitle !== "string") {
    throw new Error("subtitle muss ein Text sein.");
  }
  if (!inventory.menu || typeof inventory.menu !== "object" || Array.isArray(inventory.menu)) {
    throw new Error("menu muss ein Objekt sein.");
  }
  const supportedMenuItems = new Set(["services", "server", "notifications"]);
  for (const name of Object.keys(inventory.menu)) {
    if (!supportedMenuItems.has(name)) throw new Error(`menu.${name} wird noch nicht unterstützt.`);
  }
  for (const name of ["services", "server", "notifications"]) {
    const section = inventory.menu[name];
    if (section !== undefined && (!section || typeof section !== "object" || Array.isArray(section))) {
      throw new Error(`menu.${name} muss ein Objekt sein.`);
    }
    if (section?.subtitle !== undefined && typeof section.subtitle !== "string") {
      throw new Error(`menu.${name}.subtitle muss ein Text sein.`);
    }
    if (section?.["navigation-label"] !== undefined && !isNonEmptyString(section["navigation-label"])) {
      throw new Error(`menu.${name}.navigation-label muss ein Text sein.`);
    }
    if (section) assertKnownKeys(section, name === "notifications"
      ? ["subtitle", "channels", "rules", "maintenance-windows"]
      : ["subtitle", "navigation-label", "defaults", "groups"], `menu.${name}`);
  }
  for (const name of ["services", "server"]) {
    const section = inventory.menu[name];
    if (section?.environments !== undefined) {
      throw new Error(`menu.${name}.environments wurde durch menu.${name}.groups ersetzt.`);
    }
    if (section !== undefined && !Array.isArray(section.groups)) {
      throw new Error(`menu.${name}.groups muss eine Liste sein.`);
    }
  }
  if (inventory.environments !== undefined) {
    throw new Error("environments wurde durch menu.services.groups und menu.server.groups ersetzt.");
  }
  assertKnownKeys(inventory, ["version", "title", "subtitle", "authenticate", "menu"], "inventory");

  const validateGroup = (group, index, menuName) => {
    const path = `menu.${menuName}.groups[${index}]`;
    if (!group || typeof group !== "object" || Array.isArray(group)) throw new Error(`${path} muss ein Objekt sein.`);
    if (!isNonEmptyString(group.id) || !/^[a-z0-9][a-z0-9_-]*$/.test(group.id)) throw new Error(`${path}.id ist ungültig.`);
    if (!isNonEmptyString(group.name)) throw new Error(`${path}.name muss gesetzt sein.`);
    if (group.certificates !== undefined || group.dns !== undefined) {
      throw new Error(`${path}: certificates und dns müssen direkt am Service oder Server konfiguriert werden.`);
    }
    if (group.scope !== undefined && !["include", "ignore"].includes(group.scope)) {
      throw new Error(`${path}.scope muss include oder ignore sein.`);
    }
    assertKnownKeys(group, ["id", "name", "scope", "defaults", "categories"], path);
    if (!Array.isArray(group.categories)) throw new Error(`${path}.categories muss eine Liste sein.`);
  };

  const validateDefaults = (defaults, allowed, path) => {
    if (defaults === undefined) return;
    if (!isPlainObject(defaults)) throw new Error(`${path} muss ein Objekt sein.`);
    assertKnownKeys(defaults, allowed, path);
    if (defaults.tags !== undefined && (!Array.isArray(defaults.tags) || defaults.tags.some((tag) => !isNonEmptyString(tag)))) {
      throw new Error(`${path}.tags muss eine Liste nicht-leerer Texte sein.`);
    }
    if (defaults.tags && new Set(defaults.tags.map((tag) => tag.toLocaleLowerCase())).size !== defaults.tags.length) {
      throw new Error(`${path}.tags enthält doppelte Werte.`);
    }
    if (defaults.scope !== undefined && !["include", "ignore"].includes(defaults.scope)) {
      throw new Error(`${path}.scope muss include oder ignore sein.`);
    }
    for (const flag of ["favorite", "enabled"]) {
      if (defaults[flag] !== undefined && typeof defaults[flag] !== "boolean") {
        throw new Error(`${path}.${flag} muss true oder false sein.`);
      }
    }
    if (defaults["depends-on"] !== undefined && (!Array.isArray(defaults["depends-on"])
      || defaults["depends-on"].some((id) => !isNonEmptyString(id) || !/^[a-z0-9][a-z0-9_-]*$/.test(id)))) {
      throw new Error(`${path}.depends-on muss eine Liste gültiger Server-IDs sein.`);
    }
    if (defaults["depends-on"] && new Set(defaults["depends-on"]).size !== defaults["depends-on"].length) {
      throw new Error(`${path}.depends-on enthält doppelte Werte.`);
    }
    for (const feature of ["certificates", "dns"]) {
      const value = defaults[feature];
      if (value !== undefined && typeof value !== "boolean" && !isPlainObject(value)) {
        throw new Error(`${path}.${feature} muss true, false oder ein Objekt sein.`);
      }
    }
  };

  validateDefaults(inventory.menu.services?.defaults, serviceDefaultKeys, "menu.services.defaults");
  validateDefaults(inventory.menu.server?.defaults, serverDefaultKeys, "menu.server.defaults");

  const serviceGroupIds = new Set();
  serviceGroups(inventory).forEach((group, index) => {
    const path = `menu.services.groups[${index}]`;
    validateGroup(group, index, "services");
    validateDefaults(group.defaults, serviceDefaultKeys, `${path}.defaults`);
    if (serviceGroupIds.has(group.id)) throw new Error(`${path}.id ist doppelt vergeben.`);
    serviceGroupIds.add(group.id);
    const categoryIds = new Set();
    group.categories.forEach((category, categoryIndex) => {
      const categoryPath = `${path}.categories[${categoryIndex}]`;
      if (!category || typeof category !== "object" || Array.isArray(category)) throw new Error(`${categoryPath} muss ein Objekt sein.`);
      assertKnownKeys(category, ["id", "name", "collapsed", "layout", "defaults", "services"], categoryPath);
      validateDefaults(category.defaults, serviceDefaultKeys, `${categoryPath}.defaults`);
      if (!isNonEmptyString(category.name)) throw new Error(`${categoryPath}.name muss gesetzt sein.`);
      validateCategoryLayout(category, categoryPath);
      const categoryId = categoryIdentifier(category, categoryIndex);
      if (categoryIds.has(categoryId)) throw new Error(`${categoryPath}.id ist innerhalb der Gruppe doppelt vergeben.`);
      categoryIds.add(categoryId);
      if (category.collapsed !== undefined && typeof category.collapsed !== "boolean") throw new Error(`${categoryPath}.collapsed muss true oder false sein.`);
      if (!Array.isArray(category.services)) throw new Error(`${categoryPath}.services muss eine Liste sein.`);
      if (category.servers !== undefined) throw new Error(`${categoryPath}.servers gehört unter menu.server.`);
    });
  });

  const serverGroupIds = new Set();
  serverGroups(inventory).forEach((group, index) => {
    const path = `menu.server.groups[${index}]`;
    validateGroup(group, index, "server");
    validateDefaults(group.defaults, serverDefaultKeys, `${path}.defaults`);
    if (serverGroupIds.has(group.id)) throw new Error(`${path}.id ist doppelt vergeben.`);
    serverGroupIds.add(group.id);
    const categoryIds = new Set();
    group.categories.forEach((category, categoryIndex) => {
      const categoryPath = `${path}.categories[${categoryIndex}]`;
      if (!category || typeof category !== "object" || Array.isArray(category)) throw new Error(`${categoryPath} muss ein Objekt sein.`);
      assertKnownKeys(category, ["id", "name", "collapsed", "layout", "defaults", "servers"], categoryPath);
      validateDefaults(category.defaults, serverDefaultKeys, `${categoryPath}.defaults`);
      if (!isNonEmptyString(category.name)) throw new Error(`${categoryPath}.name muss gesetzt sein.`);
      validateCategoryLayout(category, categoryPath);
      const categoryId = categoryIdentifier(category, categoryIndex);
      if (categoryIds.has(categoryId)) throw new Error(`${categoryPath}.id ist innerhalb der Gruppe doppelt vergeben.`);
      categoryIds.add(categoryId);
      if (category.collapsed !== undefined && typeof category.collapsed !== "boolean") throw new Error(`${categoryPath}.collapsed muss true oder false sein.`);
      if (!Array.isArray(category.servers)) throw new Error(`${categoryPath}.servers muss eine Liste sein.`);
      if (category.services !== undefined) throw new Error(`${categoryPath}.services gehört unter menu.services.`);
    });
  });

  const serverIds = new Set(serverEntries(inventory).map(({ server }) => server.id));
  for (const { groupIndex, panelIndex, itemIndex, service } of serviceEntries(inventory)) {
    for (const dependency of service["depends-on"] ?? []) {
      if (!serverIds.has(dependency)) {
        throw new Error(`menu.services.groups[${groupIndex}].categories[${panelIndex}].services[${itemIndex}].depends-on verweist auf unbekannten Server ${dependency}.`);
      }
    }
  }

  validateConfig(toServicesConfig(inventory));
  validateServersConfig(toServersConfig(inventory));
  validateCertificates(inventoryCertificates(inventory));
  validateDnsChecks(inventoryDnsChecks(inventory));
  if (inventory.menu.notifications) {
    validateNotificationConfig(inventory.menu.notifications);
    const services = toServicesConfig(inventory);
    const servers = toServersConfig(inventory).servers;
    const knownTargets = {
      service: new Set(services.groups.flatMap((group) => group.panels.flatMap((panel) =>
        panel.items.map((item) => `${group.id}:${item.id ?? item.url}`.slice(0, 240))
      ))),
      monitoring: new Set(servers.filter((server) => server.monitoring).map((server) => server.id)),
      remote: new Set(servers.filter((server) => server.remote).map((server) => server.id)),
      certificate: new Set(inventoryCertificates(inventory).map((check) => check.id)),
      dns: new Set(inventoryDnsChecks(inventory).map((check) => check.id))
    };
    for (const [index, window] of (inventory.menu.notifications["maintenance-windows"] ?? []).entries()) {
      if (!knownTargets[window["target-type"]].has(window["target-id"])) {
        throw new Error(`menu.notifications.maintenance-windows[${index}].target-id verweist auf kein bekanntes Ziel.`);
      }
    }
  }
  return inventory;
}

export function createInventoryConfigStore(configFile) {
  let cachedInventory;
  let cachedMtime = -1;
  return async function getInventory() {
    const fileStat = await stat(configFile);
    if (cachedInventory && cachedMtime === fileStat.mtimeMs) return cachedInventory;
    try {
      cachedInventory = validateInventoryConfig(parseConfigText(await readFile(configFile, "utf8"), configFile));
      cachedMtime = fileStat.mtimeMs;
      return cachedInventory;
    } catch (error) {
      throw new Error(`Ungültiges Inventory in ${configFile}: ${error.message}`);
    }
  };
}
