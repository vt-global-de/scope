import { readFileSync } from "node:fs";

const protocols = new Set(["ssh", "rdp"]);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

function assertString(value, path, { required = false } = {}) {
  if (required && !isNonEmptyString(value)) throw new Error(`${path} muss ein nicht-leerer Text sein.`);
  if (value !== undefined && typeof value !== "string") throw new Error(`${path} muss ein Text sein.`);
}
export function validateRemoteConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Die Remote-Konfiguration muss ein Objekt sein.");
  }
  if (!Array.isArray(config.connections)) throw new Error("connections muss eine Liste sein.");

  const ids = new Set();
  config.connections.forEach((connection, index) => {
    const path = `connections[${index}]`;
    if (!connection || typeof connection !== "object" || Array.isArray(connection)) {
      throw new Error(`${path} muss ein Objekt sein.`);
    }
    assertString(connection.id, `${path}.id`, { required: true });
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(connection.id)) {
      throw new Error(`${path}.id darf nur Kleinbuchstaben, Zahlen, _ und - enthalten.`);
    }
    if (ids.has(connection.id)) throw new Error(`${path}.id ist doppelt vergeben.`);
    ids.add(connection.id);

    assertString(connection.name, `${path}.name`, { required: true });
    assertString(connection.description, `${path}.description`);
    assertString(connection.environment, `${path}.environment`);
    assertString(connection.groupId, `${path}.groupId`);
    assertString(connection.groupName, `${path}.groupName`);
    assertString(connection.category, `${path}.category`);
    assertString(connection.categoryId, `${path}.categoryId`);
    if (connection.tags !== undefined && (!Array.isArray(connection.tags) || connection.tags.some((tag) => !isNonEmptyString(tag)))) {
      throw new Error(`${path}.tags muss eine Liste nicht-leerer Texte sein.`);
    }
    if (connection.favorite !== undefined && typeof connection.favorite !== "boolean") throw new Error(`${path}.favorite muss true oder false sein.`);
    if (connection.scope !== undefined && !["include", "ignore"].includes(connection.scope)) {
      throw new Error(`${path}.scope muss include oder ignore sein.`);
    }
    if (connection.categoryCollapsed !== undefined && typeof connection.categoryCollapsed !== "boolean") {
      throw new Error(`${path}.categoryCollapsed muss true oder false sein.`);
    }
    assertString(connection.icon, `${path}.icon`);
    if (!protocols.has(connection.protocol)) throw new Error(`${path}.protocol muss ssh oder rdp sein.`);
    if (connection.probe !== undefined && !["tcp", "handshake"].includes(connection.probe)) {
      throw new Error(`${path}.probe muss tcp oder handshake sein.`);
    }
    if (connection.enabled !== undefined && typeof connection.enabled !== "boolean") {
      throw new Error(`${path}.enabled muss true oder false sein.`);
    }
    if (!connection.parameters || typeof connection.parameters !== "object" || Array.isArray(connection.parameters)) {
      throw new Error(`${path}.parameters muss ein Objekt sein.`);
    }
    const unknownParameter = Object.keys(connection.parameters).find((key) => ![
      "hostname", "port", "username", "password", "private-key", "private-key-file", "domain", "width", "height", "security",
      "ignore-cert", "certificate-fingerprint", "clipboard", "keyboard-layout", "connect-timeout", "host-key-policy", "known-hosts-file"
    ].includes(key));
    if (unknownParameter) throw new Error(`${path}.parameters.${unknownParameter} ist unbekannt.`);
    if (!isNonEmptyString(connection.parameters.hostname)) {
      throw new Error(`${path}.parameters.hostname muss gesetzt sein.`);
    }
  });

  return config;
}

export function resolveConnection(connection, environment = process.env) {
  const parameters = Object.fromEntries(
    Object.entries(connection.parameters).map(([name, rawValue]) => {
      const value = String(rawValue);
      const fileReference = value.match(/^\$\{FILE:(\/run\/secrets\/[A-Za-z0-9._-]+)\}$/);
      if (fileReference) {
        const resolved = readFileSync(fileReference[1], "utf8").trim();
        if (!resolved) throw new Error(`Secret-Datei ${fileReference[1]} ist leer.`);
        return [name, resolved];
      }
      const secretReference = value.match(/^\$\{([A-Z][A-Z0-9_]*)\}$/);
      if (!secretReference) return [name, value];

      const resolved = environment[secretReference[1]];
      if (!isNonEmptyString(resolved)) throw new Error(`Umgebungsvariable ${secretReference[1]} fehlt.`);
      return [name, resolved];
    })
  );

  if (!parameters.port) parameters.port = connection.protocol === "rdp" ? "3389" : "22";
  if (!/^[A-Za-z0-9][A-Za-z0-9.:%_-]*$/.test(parameters.hostname)) {
    throw new Error(`Hostname der Verbindung ${connection.id} ist ungültig.`);
  }
  const port = Number.parseInt(parameters.port, 10);
  if (!Number.isInteger(port) || String(port) !== parameters.port || port < 1 || port > 65535) {
    throw new Error(`Port der Verbindung ${connection.id} ist ungültig.`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._@\\-]*$/.test(parameters.username ?? "")) {
    throw new Error(`Benutzername der Verbindung ${connection.id} ist ungültig.`);
  }
  if (connection.protocol === "rdp" && !isNonEmptyString(parameters.password)) {
    throw new Error(`RDP-Verbindung ${connection.id} benötigt ein Passwort.`);
  }
  if (connection.protocol === "rdp") {
    for (const [name, fallback, minimum, maximum] of [["width", "1440", 640, 3840], ["height", "900", 480, 2160]]) {
      const value = Number.parseInt(parameters[name] ?? fallback, 10);
      if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} der RDP-Verbindung ${connection.id} ist ungültig.`);
      }
      parameters[name] = String(value);
    }
  }
  if (parameters["host-key-policy"] !== undefined && !["strict", "accept-new", "off"].includes(parameters["host-key-policy"])) {
    throw new Error(`host-key-policy der Verbindung ${connection.id} muss strict, accept-new oder off sein.`);
  }
  if (parameters["private-key-file"] !== undefined && !/^\/[A-Za-z0-9._/-]+$/.test(parameters["private-key-file"])) {
    throw new Error(`private-key-file der Verbindung ${connection.id} muss ein absoluter Pfad sein.`);
  }
  if (parameters["known-hosts-file"] !== undefined && !/^\/[A-Za-z0-9._/-]+$/.test(parameters["known-hosts-file"])) {
    throw new Error(`known-hosts-file der Verbindung ${connection.id} muss ein absoluter Pfad sein.`);
  }
  if (parameters["certificate-fingerprint"] !== undefined && !/^[A-Fa-f0-9:]{32,191}$/.test(parameters["certificate-fingerprint"])) {
    throw new Error(`certificate-fingerprint der Verbindung ${connection.id} ist ungültig.`);
  }
  if (connection.protocol === "ssh" && !isNonEmptyString(parameters.password)
    && !isNonEmptyString(parameters["private-key-file"]) && !isNonEmptyString(parameters["private-key"])) {
    throw new Error(`SSH-Verbindung ${connection.id} benötigt ein Passwort oder private-key-file.`);
  }
  return { ...connection, parameters };
}

export function toPublicConnection(connection) {
  return {
    id: connection.id,
    name: connection.name,
    description: connection.description ?? "",
    environment: connection.environment ?? "Allgemein",
    groupId: connection.groupId ?? "general",
    groupName: connection.groupName ?? connection.environment ?? "Allgemein",
    category: connection.category ?? "Servers",
    ...(connection.categoryId ? { categoryId: connection.categoryId } : {}),
    categoryCollapsed: connection.categoryCollapsed === true,
    ...(connection.categoryLayout ? { categoryLayout: connection.categoryLayout } : {}),
    tags: connection.tags ?? [],
    favorite: connection.favorite === true,
    ...(connection.scope ? { scope: connection.scope } : {}),
    protocol: connection.protocol,
    probe: connection.probe ?? "tcp",
    icon: connection.icon ?? connection.protocol.toUpperCase(),
    certificateMonitoring: connection.certificateMonitoring === true,
    dnsMonitoring: connection.dnsMonitoring === true
  };
}
