const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const variablePattern = /^\$\{([A-Z_][A-Z0-9_]*)\}$/;

function assertText(value, path, { required = false } = {}) {
  if (required && !isNonEmptyString(value)) throw new Error(`${path} muss gesetzt sein.`);
  if (value !== undefined && typeof value !== "string") throw new Error(`${path} muss ein Text sein.`);
}

function isVariableReference(value) {
  return typeof value === "string" && variablePattern.test(value);
}

function assertPort(value, path) {
  if (value === undefined || isVariableReference(value)) return;
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${path} muss eine gültige Portnummer oder eine Env-Referenz sein.`);
  }
}

function assertBoolean(value, path) {
  if (value === undefined || typeof value === "boolean" || isVariableReference(value)) return;
  throw new Error(`${path} muss true, false oder eine Env-Referenz sein.`);
}

function resolved(value, environment) {
  const match = typeof value === "string" ? value.match(variablePattern) : null;
  if (!match) return { value: String(value ?? "").trim() };
  const environmentValue = String(environment[match[1]] ?? "").trim();
  return { value: environmentValue, missingVariable: environmentValue ? undefined : match[1] };
}

function resolvedValue(value, environment) {
  return resolved(value, environment).value;
}

function resolvedPort(value, environment) {
  if (value === undefined) return undefined;
  return Number.parseInt(resolvedValue(value, environment), 10);
}

function resolvedBoolean(value, environment) {
  if (value === undefined || typeof value === "boolean") return value;
  return resolvedValue(value, environment).toLowerCase() === "true";
}

function readiness(channel, environment) {
  const requiredFields = channel.type === "smtp" ? ["hostname", "from", "to"] : ["webhook-url"];
  if (channel.type === "smtp" && (channel.username !== undefined || channel.password !== undefined)) {
    requiredFields.push("username", "password");
  }
  if (channel.type === "smtp" && channel.port !== undefined) requiredFields.push("port");
  if (channel.type === "smtp" && channel.secure !== undefined) requiredFields.push("secure");
  const missingVariables = [];
  const missingFields = [];
  for (const field of requiredFields) {
    const result = resolved(channel[field], environment);
    if (result.missingVariable) missingVariables.push(result.missingVariable);
    else if (!result.value) missingFields.push(field);
    else if (field === "port" && (!/^\d+$/.test(result.value) || Number(result.value) < 1 || Number(result.value) > 65535)) {
      missingFields.push(field);
    } else if (field === "secure" && !["true", "false"].includes(result.value.toLowerCase())) missingFields.push(field);
  }
  return { missingVariables: [...new Set(missingVariables)], missingFields };
}

export function validateNotificationConfig(section) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new Error("menu.notifications muss ein Objekt sein.");
  }
  if (section.channels !== undefined && !Array.isArray(section.channels)) {
    throw new Error("menu.notifications.channels muss eine Liste sein.");
  }

  if (section["maintenance-windows"] !== undefined && !Array.isArray(section["maintenance-windows"])) {
    throw new Error("menu.notifications.maintenance-windows muss eine Liste sein.");
  }
  (section["maintenance-windows"] ?? []).forEach((window, index) => {
    const path = `menu.notifications.maintenance-windows[${index}]`;
    if (!window || typeof window !== "object" || Array.isArray(window)) throw new Error(`${path} muss ein Objekt sein.`);
    const unknownKey = Object.keys(window).find((key) => !["target-type", "target-id", "from", "until", "reason"].includes(key));
    if (unknownKey) throw new Error(`${path}.${unknownKey} ist unbekannt.`);
    if (!["service", "remote", "monitoring", "certificate", "dns"].includes(window["target-type"])) {
      throw new Error(`${path}.target-type ist ungültig.`);
    }
    assertText(window["target-id"], `${path}.target-id`, { required: true });
    assertText(window.from, `${path}.from`);
    assertText(window.until, `${path}.until`, { required: true });
    assertText(window.reason, `${path}.reason`);
    if (window.from && !Number.isFinite(Date.parse(window.from))) throw new Error(`${path}.from muss ein ISO-Zeitpunkt sein.`);
    if (!Number.isFinite(Date.parse(window.until))) throw new Error(`${path}.until muss ein ISO-Zeitpunkt sein.`);
    if (window.from && Date.parse(window.until) <= Date.parse(window.from)) throw new Error(`${path}.until muss nach from liegen.`);
  });

  const ids = new Set();
  const channels = section.channels ?? [];
  channels.forEach((channel, index) => {
    const path = `menu.notifications.channels[${index}]`;
    if (!channel || typeof channel !== "object" || Array.isArray(channel)) throw new Error(`${path} muss ein Objekt sein.`);
    const allowedKeys = channel.type === "discord"
      ? ["id", "name", "type", "enabled", "webhook-url"]
      : ["id", "name", "type", "enabled", "hostname", "port", "secure", "username", "password", "from", "to"];
    const unknownKey = Object.keys(channel).find((key) => !allowedKeys.includes(key));
    if (unknownKey) throw new Error(`${path}.${unknownKey} ist unbekannt.`);
    assertText(channel.id, `${path}.id`, { required: true });
    assertText(channel.name, `${path}.name`, { required: true });
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(channel.id)) throw new Error(`${path}.id ist ungültig.`);
    if (ids.has(channel.id)) throw new Error(`${path}.id ist doppelt vergeben.`);
    ids.add(channel.id);
    if (!["smtp", "discord"].includes(channel.type)) throw new Error(`${path}.type muss smtp oder discord sein.`);
    if (channel.enabled !== undefined && typeof channel.enabled !== "boolean") throw new Error(`${path}.enabled muss true oder false sein.`);

    if (channel.type === "smtp") {
      for (const field of ["hostname", "username", "password", "from", "to"]) assertText(channel[field], `${path}.${field}`);
      assertPort(channel.port, `${path}.port`);
      assertBoolean(channel.secure, `${path}.secure`);
    } else {
      assertText(channel["webhook-url"], `${path}.webhook-url`);
    }
  });

  if (section.rules !== undefined && !Array.isArray(section.rules)) {
    throw new Error("menu.notifications.rules muss eine Liste sein.");
  }
  const ruleIds = new Set();
  const channelIds = new Set(channels.map((channel) => channel.id));
  (section.rules ?? []).forEach((rule, index) => {
    const path = `menu.notifications.rules[${index}]`;
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) throw new Error(`${path} muss ein Objekt sein.`);
    const unknownKey = Object.keys(rule).find((key) => ![
      "id", "name", "enabled", "events", "channels", "delay-seconds"
    ].includes(key));
    if (unknownKey) throw new Error(`${path}.${unknownKey} ist unbekannt.`);
    assertText(rule.id, `${path}.id`, { required: true });
    assertText(rule.name, `${path}.name`);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(rule.id)) throw new Error(`${path}.id ist ungültig.`);
    if (ruleIds.has(rule.id)) throw new Error(`${path}.id ist doppelt vergeben.`);
    ruleIds.add(rule.id);
    if (rule.enabled !== undefined && typeof rule.enabled !== "boolean") throw new Error(`${path}.enabled muss true oder false sein.`);
    if (!Array.isArray(rule.events) || rule.events.length === 0
      || rule.events.some((event) => !["down", "recovered"].includes(event))) {
      throw new Error(`${path}.events muss down und/oder recovered enthalten.`);
    }
    if (new Set(rule.events).size !== rule.events.length) throw new Error(`${path}.events enthält doppelte Werte.`);
    if (!Array.isArray(rule.channels) || rule.channels.length === 0) throw new Error(`${path}.channels muss Kanäle enthalten.`);
    if (new Set(rule.channels).size !== rule.channels.length) throw new Error(`${path}.channels enthält doppelte Werte.`);
    const missingChannel = rule.channels.find((id) => !channelIds.has(id));
    if (missingChannel) throw new Error(`${path}.channels verweist auf unbekannten Kanal ${missingChannel}.`);
    if (rule["delay-seconds"] !== undefined
      && (!Number.isInteger(rule["delay-seconds"]) || rule["delay-seconds"] < 0 || rule["delay-seconds"] > 86400)) {
      throw new Error(`${path}.delay-seconds muss zwischen 0 und 86400 liegen.`);
    }
  });
  return section;
}

export function publicNotificationChannels(section, environment = process.env) {
  validateNotificationConfig(section);
  return (section.channels ?? []).map((channel) => {
    const { missingVariables, missingFields } = readiness(channel, environment);
    const channelEnabled = channel.enabled !== false;
    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      enabled: channelEnabled,
      ready: channelEnabled && missingVariables.length === 0 && missingFields.length === 0,
      missingVariables,
      missingFields
    };
  });
}

export function resolveNotificationChannel(section, id, environment = process.env) {
  validateNotificationConfig(section);
  const channel = (section.channels ?? []).find((candidate) => candidate.id === id);
  if (!channel) return null;
  const { missingVariables, missingFields } = readiness(channel, environment);
  return {
    ...channel,
    enabled: channel.enabled !== false,
    ready: channel.enabled !== false && missingVariables.length === 0 && missingFields.length === 0,
    missingVariables,
    missingFields,
    ...(channel.type === "smtp" ? {
      hostname: resolvedValue(channel.hostname, environment),
      port: resolvedPort(channel.port, environment),
      secure: resolvedBoolean(channel.secure, environment),
      username: resolvedValue(channel.username, environment),
      password: resolvedValue(channel.password, environment),
      from: resolvedValue(channel.from, environment),
      to: resolvedValue(channel.to, environment)
    } : { "webhook-url": resolvedValue(channel["webhook-url"], environment) })
  };
}
