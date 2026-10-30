const connectionTypes = new Set(["socket", "tcp", "tls"]);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

function assertString(value, path, { required = false } = {}) {
  if (required && !isNonEmptyString(value)) throw new Error(`${path} muss ein nicht-leerer Text sein.`);
  if (value !== undefined && typeof value !== "string") throw new Error(`${path} muss ein Text sein.`);
}
export function validateMonitoringConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Die Monitoring-Konfiguration muss ein Objekt sein.");
  }
  if (!Array.isArray(config.hosts)) throw new Error("hosts muss eine Liste sein.");

  const ids = new Set();
  config.hosts.forEach((host, index) => {
    const path = `hosts[${index}]`;
    if (!host || typeof host !== "object" || Array.isArray(host)) throw new Error(`${path} muss ein Objekt sein.`);
    assertString(host.id, `${path}.id`, { required: true });
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(host.id)) throw new Error(`${path}.id ist ungültig.`);
    if (ids.has(host.id)) throw new Error(`${path}.id ist doppelt vergeben.`);
    ids.add(host.id);
    assertString(host.name, `${path}.name`, { required: true });
    assertString(host.description, `${path}.description`);
    assertString(host.environment, `${path}.environment`);
    assertString(host.groupId, `${path}.groupId`);
    assertString(host.groupName, `${path}.groupName`);
    assertString(host.category, `${path}.category`);
    assertString(host.categoryId, `${path}.categoryId`);
    if (host.tags !== undefined && (!Array.isArray(host.tags) || host.tags.some((tag) => !isNonEmptyString(tag)))) {
      throw new Error(`${path}.tags muss eine Liste nicht-leerer Texte sein.`);
    }
    if (host.favorite !== undefined && typeof host.favorite !== "boolean") throw new Error(`${path}.favorite muss true oder false sein.`);
    if (host.scope !== undefined && !["include", "ignore"].includes(host.scope)) {
      throw new Error(`${path}.scope muss include oder ignore sein.`);
    }
    if (host.categoryCollapsed !== undefined && typeof host.categoryCollapsed !== "boolean") {
      throw new Error(`${path}.categoryCollapsed muss true oder false sein.`);
    }
    assertString(host["remote-connection"], `${path}.remote-connection`);
    if (host["remote-connection"] !== undefined && !/^[a-z0-9][a-z0-9_-]*$/.test(host["remote-connection"])) {
      throw new Error(`${path}.remote-connection ist ungültig.`);
    }
    if (host.enabled !== undefined && typeof host.enabled !== "boolean") throw new Error(`${path}.enabled muss true oder false sein.`);
    if (!host.connection || typeof host.connection !== "object" || Array.isArray(host.connection)) {
      throw new Error(`${path}.connection muss ein Objekt sein.`);
    }
    const connectionPath = `${path}.connection`;
    const unknownConnectionKey = Object.keys(host.connection).find((key) => ![
      "type", "path", "hostname", "port", "ca-file", "cert-file", "key-file", "server-name", "reject-unauthorized"
    ].includes(key));
    if (unknownConnectionKey) throw new Error(`${connectionPath}.${unknownConnectionKey} ist unbekannt.`);
    if (!connectionTypes.has(host.connection.type)) throw new Error(`${connectionPath}.type muss socket, tcp oder tls sein.`);
    if (host.connection.type === "socket") {
      assertString(host.connection.path, `${connectionPath}.path`);
    } else {
      assertString(host.connection.hostname, `${connectionPath}.hostname`, { required: true });
    }
    assertString(host.connection["ca-file"], `${connectionPath}.ca-file`);
    assertString(host.connection["cert-file"], `${connectionPath}.cert-file`);
    assertString(host.connection["key-file"], `${connectionPath}.key-file`);
    assertString(host.connection["server-name"], `${connectionPath}.server-name`);
    if (host.connection["reject-unauthorized"] !== undefined && typeof host.connection["reject-unauthorized"] !== "boolean") {
      throw new Error(`${connectionPath}.reject-unauthorized muss true oder false sein.`);
    }
    if (Boolean(host.connection["cert-file"]) !== Boolean(host.connection["key-file"])) {
      throw new Error(`${connectionPath}.cert-file und key-file müssen gemeinsam gesetzt sein.`);
    }
  });
  return config;
}

export function resolveMonitoringHost(host) {
  const connection = { ...host.connection };
  if (connection.type === "socket") {
    connection.path ??= "/var/run/docker.sock";
    if (!/^\/[A-Za-z0-9._/-]+$/.test(connection.path)) throw new Error(`Socket-Pfad von ${host.id} ist ungültig.`);
  } else {
    if (!/^[A-Za-z0-9][A-Za-z0-9.:%_-]*$/.test(connection.hostname)) throw new Error(`Hostname von ${host.id} ist ungültig.`);
    const defaultPort = connection.type === "tls" ? 2376 : 2375;
    const port = Number.parseInt(String(connection.port ?? defaultPort), 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Port von ${host.id} ist ungültig.`);
    connection.port = port;
  }
  return { ...host, connection };
}

export function toPublicMonitoringHost(host) {
  return {
    id: host.id,
    name: host.name,
    description: host.description ?? "",
    environment: host.environment ?? "Allgemein",
    groupId: host.groupId ?? "general",
    groupName: host.groupName ?? host.environment ?? "Allgemein",
    category: host.category ?? "Servers",
    ...(host.categoryId ? { categoryId: host.categoryId } : {}),
    categoryCollapsed: host.categoryCollapsed === true,
    ...(host.categoryLayout ? { categoryLayout: host.categoryLayout } : {}),
    tags: host.tags ?? [],
    favorite: host.favorite === true,
    ...(host.scope ? { scope: host.scope } : {}),
    connectionType: host.connection.type,
    remoteConnection: host["remote-connection"] ?? null,
    certificateMonitoring: host.certificateMonitoring === true,
    dnsMonitoring: host.dnsMonitoring === true
  };
}
