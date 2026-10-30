import { validateMonitoringConfig } from "./monitoring-config.mjs";
import { validateRemoteConfig } from "./remote-config.mjs";

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

function sectionEnabled(server, section) {
  return server.enabled !== false && section.enabled !== false;
}

export function toMonitoringConfig(config) {
  return {
    hosts: config.servers.filter((server) => server.monitoring).map((server) => ({
      id: server.id,
      name: server.name,
      description: server.description,
      environment: server.environment,
      groupId: server.groupId,
      groupName: server.groupName,
      category: server.category,
      categoryId: server.categoryId,
      categoryCollapsed: server.categoryCollapsed,
      categoryLayout: server.categoryLayout,
      tags: server.tags,
      favorite: server.favorite,
      scope: server.scope,
      enabled: sectionEnabled(server, server.monitoring),
      connection: server.monitoring.connection,
      ...(server.remote && sectionEnabled(server, server.remote) ? { "remote-connection": server.id } : {}),
      certificateMonitoring: Boolean(server.certificates && server.certificates.enabled !== false),
      dnsMonitoring: Boolean(server.dns && server.dns.enabled !== false)
    }))
  };
}

export function toRemoteConfig(config) {
  return {
    connections: config.servers.filter((server) => server.remote).map((server) => ({
      id: server.id,
      name: server.name,
      description: server.description,
      environment: server.environment,
      groupId: server.groupId,
      groupName: server.groupName,
      category: server.category,
      categoryId: server.categoryId,
      categoryCollapsed: server.categoryCollapsed,
      categoryLayout: server.categoryLayout,
      tags: server.tags,
      favorite: server.favorite,
      scope: server.scope,
      enabled: sectionEnabled(server, server.remote),
      protocol: server.remote.protocol,
      probe: server.remote.probe,
      icon: server.remote.icon,
      parameters: server.remote.parameters,
      certificateMonitoring: Boolean(server.certificates && server.certificates.enabled !== false),
      dnsMonitoring: Boolean(server.dns && server.dns.enabled !== false)
    }))
  };
}

export function validateServersConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Die Server-Konfiguration muss ein Objekt sein.");
  }
  if (!Array.isArray(config.servers)) throw new Error("servers muss eine Liste sein.");

  const ids = new Set();
  config.servers.forEach((server, index) => {
    const path = `servers[${index}]`;
    if (!server || typeof server !== "object" || Array.isArray(server)) throw new Error(`${path} muss ein Objekt sein.`);
    const unknownKey = Object.keys(server).find((key) => ![
      "id", "name", "description", "environment", "groupId", "groupName", "category", "categoryId", "categoryCollapsed", "categoryLayout",
      "tags", "favorite", "scope", "enabled", "monitoring", "remote", "certificates", "dns"
    ].includes(key));
    if (unknownKey) throw new Error(`${path}.${unknownKey} ist unbekannt.`);
    if (!isNonEmptyString(server.id) || !/^[a-z0-9][a-z0-9_-]*$/.test(server.id)) throw new Error(`${path}.id ist ungültig.`);
    if (ids.has(server.id)) throw new Error(`${path}.id ist doppelt vergeben.`);
    ids.add(server.id);
    if (!isNonEmptyString(server.name)) throw new Error(`${path}.name muss gesetzt sein.`);
    if (server.favorite !== undefined && typeof server.favorite !== "boolean") throw new Error(`${path}.favorite muss true oder false sein.`);
    if (server.scope !== undefined && !["include", "ignore"].includes(server.scope)) {
      throw new Error(`${path}.scope muss include oder ignore sein.`);
    }
    if (server.tags !== undefined) {
      if (!Array.isArray(server.tags) || server.tags.some((tag) => !isNonEmptyString(tag))) {
        throw new Error(`${path}.tags muss eine Liste nicht-leerer Texte sein.`);
      }
      if (new Set(server.tags.map((tag) => tag.toLowerCase())).size !== server.tags.length) {
        throw new Error(`${path}.tags enthält doppelte Werte.`);
      }
    }
    if (!server.monitoring && !server.remote) throw new Error(`${path} benötigt monitoring oder remote.`);
    for (const feature of ["certificates", "dns"]) {
      const value = server[feature];
      if (value !== undefined && typeof value !== "boolean" && (!value || typeof value !== "object" || Array.isArray(value))) {
        throw new Error(`${path}.${feature} muss true, false oder ein Objekt sein.`);
      }
    }
    if (server.monitoring) {
      const unknownMonitoringKey = Object.keys(server.monitoring).find((key) => !["type", "enabled", "connection"].includes(key));
      if (unknownMonitoringKey) throw new Error(`${path}.monitoring.${unknownMonitoringKey} ist unbekannt.`);
      if (server.monitoring.type !== undefined && server.monitoring.type !== "docker") {
        throw new Error(`${path}.monitoring.type muss docker sein.`);
      }
      if (!server.monitoring.connection || typeof server.monitoring.connection !== "object") {
        throw new Error(`${path}.monitoring.connection muss gesetzt sein.`);
      }
    }
    if (server.remote && (!server.remote.parameters || typeof server.remote.parameters !== "object")) {
      throw new Error(`${path}.remote.parameters muss gesetzt sein.`);
    }
    if (server.remote) {
      const unknownRemoteKey = Object.keys(server.remote).find((key) => !["protocol", "probe", "icon", "enabled", "parameters"].includes(key));
      if (unknownRemoteKey) throw new Error(`${path}.remote.${unknownRemoteKey} ist unbekannt.`);
      if (server.remote.probe !== undefined && !["tcp", "handshake"].includes(server.remote.probe)) {
        throw new Error(`${path}.remote.probe muss tcp oder handshake sein.`);
      }
    }
  });

  validateMonitoringConfig(toMonitoringConfig(config));
  validateRemoteConfig(toRemoteConfig(config));
  return config;
}
