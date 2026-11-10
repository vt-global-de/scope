const identifierPattern = /^[a-z0-9][a-z0-9_-]*$/;
const reverseProxyDrivers = new Set(["traefik", "caddy", "nginx-proxy-manager"]);
const isText = (value) => typeof value === "string" && value.trim().length > 0;

export function validateDiscoveryConfig(section) {
  if (section === undefined) return;
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new Error("discovery muss ein Objekt sein.");
  }
  const unknownSectionKey = Object.keys(section).find((key) => !["enabled", "providers"].includes(key));
  if (unknownSectionKey) throw new Error(`discovery.${unknownSectionKey} ist unbekannt.`);
  if (section.enabled !== undefined && typeof section.enabled !== "boolean") {
    throw new Error("discovery.enabled muss true oder false sein.");
  }
  if (!Array.isArray(section.providers)) throw new Error("discovery.providers muss eine Liste sein.");

  const ids = new Set();
  section.providers.forEach((provider, index) => {
    const path = `discovery.providers[${index}]`;
    if (!provider || typeof provider !== "object" || Array.isArray(provider)) throw new Error(`${path} muss ein Objekt sein.`);
    const allowed = [
      "id", "name", "type", "driver", "enabled", "authoritative", "server", "url", "token-env",
      "token-prefix", "timeout-ms", "reject-unauthorized", "depends-on"
    ];
    const unknown = Object.keys(provider).find((key) => !allowed.includes(key));
    if (unknown) throw new Error(`${path}.${unknown} ist unbekannt.`);
    if (!isText(provider.id) || !identifierPattern.test(provider.id)) throw new Error(`${path}.id ist ungültig.`);
    if (ids.has(provider.id)) throw new Error(`${path}.id ist doppelt vergeben.`);
    ids.add(provider.id);
    if (provider.name !== undefined && !isText(provider.name)) throw new Error(`${path}.name muss ein nicht-leerer Text sein.`);
    if (!new Set(["docker", "reverse-proxy"]).has(provider.type)) {
      throw new Error(`${path}.type muss docker oder reverse-proxy sein.`);
    }
    for (const flag of ["enabled", "authoritative", "reject-unauthorized"]) {
      if (provider[flag] !== undefined && typeof provider[flag] !== "boolean") throw new Error(`${path}.${flag} muss true oder false sein.`);
    }
    if (provider["depends-on"] !== undefined && (!Array.isArray(provider["depends-on"])
      || provider["depends-on"].some((id) => !isText(id) || !identifierPattern.test(id)))) {
      throw new Error(`${path}.depends-on muss eine Liste gültiger Server-IDs sein.`);
    }
    if (provider["depends-on"] && new Set(provider["depends-on"]).size !== provider["depends-on"].length) {
      throw new Error(`${path}.depends-on enthält doppelte Werte.`);
    }
    if (provider["timeout-ms"] !== undefined
      && (!Number.isInteger(provider["timeout-ms"]) || provider["timeout-ms"] < 250 || provider["timeout-ms"] > 60000)) {
      throw new Error(`${path}.timeout-ms muss zwischen 250 und 60000 liegen.`);
    }
    if (provider.type === "docker") {
      if (!isText(provider.server) || !identifierPattern.test(provider.server)) throw new Error(`${path}.server ist ungültig.`);
      if (["driver", "url", "token-env", "token-prefix", "reject-unauthorized"].some((key) => provider[key] !== undefined)) {
        throw new Error(`${path}: Docker verwendet server statt Reverse-Proxy-Einstellungen.`);
      }
    } else {
      if (provider.server !== undefined) throw new Error(`${path}.server ist nur für Docker-Provider erlaubt.`);
      if (!reverseProxyDrivers.has(provider.driver)) {
        throw new Error(`${path}.driver muss traefik, caddy oder nginx-proxy-manager sein.`);
      }
      if (!isText(provider.url)) throw new Error(`${path}.url muss gesetzt sein.`);
      let url;
      try { url = new URL(provider.url); } catch { throw new Error(`${path}.url ist ungültig.`); }
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        throw new Error(`${path}.url muss eine HTTP(S)-URL ohne Zugangsdaten sein.`);
      }
      if (provider["token-env"] !== undefined && (!isText(provider["token-env"]) || !/^[A-Z][A-Z0-9_]*$/.test(provider["token-env"]))) {
        throw new Error(`${path}.token-env muss der Name einer Umgebungsvariable sein.`);
      }
      if (provider["token-prefix"] !== undefined && (typeof provider["token-prefix"] !== "string" || /[\r\n]/.test(provider["token-prefix"]))) {
        throw new Error(`${path}.token-prefix muss ein Text sein.`);
      }
    }
  });
}
