import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { dockerApiRequest } from "./monitoring.mjs";
import { resolveMonitoringHost } from "./monitoring-config.mjs";
import { toMonitoringConfig } from "./servers-config.mjs";
import { toServersConfig, toServicesConfig } from "./inventory-config.mjs";

const maximumResponseBytes = 8 * 1024 * 1024;
const cleanError = (error) => String(error?.message || "Discovery failed").replace(/[\r\n\t]+/g, " ").slice(0, 240);

export function discoveryProviderDependencies(inventory, provider) {
  if (provider["depends-on"]?.length) return [...provider["depends-on"]];
  if (provider.type === "docker" && provider.server) return [provider.server];
  if (provider.type !== "reverse-proxy" || !provider.url) return [];
  let providerHostname;
  try { providerHostname = new URL(provider.url).hostname.toLowerCase(); } catch { return []; }
  const proxyService = toServicesConfig(inventory).groups.flatMap((group) => group.panels.flatMap((panel) => panel.items))
    .find((service) => {
      try { return new URL(service.url).hostname.toLowerCase() === providerHostname; } catch { return false; }
    });
  return [...(proxyService?.["depends-on"] ?? [])];
}

function endpoint(base, path) {
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/\/$/, "")}${path}`;
  url.search = "";
  return url;
}

export function jsonRequest(url, { timeoutMs = 5000, token, tokenPrefix = "Bearer ", rejectUnauthorized = true, requestImpl } = {}) {
  const parsed = typeof url === "string" ? new URL(url) : url;
  const implementation = requestImpl ?? (parsed.protocol === "https:" ? httpsRequest : httpRequest);
  const headers = { Accept: "application/json", "User-Agent": "Scope/1.1 discovery" };
  if (token) headers.Authorization = `${tokenPrefix}${token}`;
  return new Promise((resolve, reject) => {
    const request = implementation(parsed, { headers, ...(parsed.protocol === "https:" ? { rejectUnauthorized } : {}) }, (response) => {
      const chunks = [];
      let length = 0;
      response.on("data", (chunk) => {
        length += chunk.length;
        if (length > maximumResponseBytes) request.destroy(new Error("Discovery response is too large."));
        else chunks.push(chunk);
      });
      response.once("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if ((response.statusCode ?? 500) < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}: ${body.slice(0, 160)}`));
          return;
        }
        try { resolve(body ? JSON.parse(body) : null); }
        catch { reject(new Error("Discovery endpoint returned invalid JSON.")); }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("Discovery request timed out.")));
    request.once("error", reject);
    request.end();
  });
}

function normalizeDomain(value) {
  return String(value ?? "").trim().toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
}

function suggestionId(hostname) {
  return hostname.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "discovered-service";
}

const iconHints = [
  ["authentik", "authentik"], ["gitlab", "gitlab"], ["github", "github"],
  ["grafana", "grafana"], ["prometheus", "prometheus"], ["portainer", "portainer"],
  ["proxmox", "proxmox"], ["traefik", "traefik"], ["nginx", "nginx"], ["caddy", "caddy"],
  ["nextcloud", "nextcloud"], ["jellyfin", "jellyfin"], ["plex", "plex"],
  ["home-assistant", "home-assistant"], ["postgres", "postgresql"], ["mariadb", "mariadb"],
  ["redis", "redis"], ["vaultwarden", "vaultwarden"], ["bitwarden", "bitwarden"]
];

function serviceHint(item) {
  return String(item.hostname.split(".")[0] ?? "")
    .replace(/@[^@]+$/, "")
    .replace(/:\d+$/, "")
    .toLowerCase();
}

function friendlyServiceName(item) {
  const source = serviceHint(item) || item.hostname.split(".")[0];
  return source.split(/[-_.]+/).filter(Boolean).map((part) => {
    if (/^(api|dns|git|idp|nas|npm|rdp|ssh|ui|vm|vpn|vt)$/i.test(part)) return part.toUpperCase();
    return `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`;
  }).join(" ") || item.hostname;
}

function suggestedIcon(item) {
  const source = `${serviceHint(item)} ${item.metadata?.service ?? ""} ${item.hostname}`.toLowerCase();
  return iconHints.find(([hint]) => source.includes(hint))?.[1];
}

function domainsFromTraefikRule(rule) {
  return [...String(rule ?? "").matchAll(/Host\(([^)]+)\)/g)].flatMap((match) =>
    [...match[1].matchAll(/[`'"]([^`'"]+)[`'"]/g)].map((entry) => normalizeDomain(entry[1]))
  ).filter(Boolean);
}

function route(id, hostname, providerId, metadata = {}) {
  const normalized = normalizeDomain(hostname);
  return { id: `${providerId}:${id}:${normalized}`, hostname: normalized, url: normalized ? `https://${normalized}` : null, metadata };
}

export function normalizeTraefik(routers, providerId) {
  return (Array.isArray(routers) ? routers : []).flatMap((router, index) =>
    domainsFromTraefikRule(router.rule).map((hostname) => route(router.name ?? index, hostname, providerId, {
      service: router.service ?? null, status: router.status ?? null, entryPoints: router.entryPoints ?? []
    }))
  );
}

function caddyRouteHosts(value, result = []) {
  if (Array.isArray(value)) value.forEach((entry) => caddyRouteHosts(entry, result));
  else if (value && typeof value === "object") {
    if (Array.isArray(value.host)) value.host.forEach((host) => result.push(normalizeDomain(host)));
    Object.values(value).forEach((entry) => caddyRouteHosts(entry, result));
  }
  return result;
}

export function normalizeCaddy(config, providerId) {
  return [...new Set(caddyRouteHosts(config).filter(Boolean))].map((hostname, index) => route(index, hostname, providerId));
}

export function normalizeNpm(hosts, providerId) {
  return (Array.isArray(hosts) ? hosts : []).flatMap((host, index) =>
    (host.domain_names ?? []).map((hostname) => route(host.id ?? index, hostname, providerId, {
      backend: host.forward_host ? `${host.forward_scheme ?? "http"}://${host.forward_host}:${host.forward_port}` : null,
      enabled: host.enabled !== 0
    }))
  );
}

async function discoverDocker(provider, inventory, options) {
  const hosts = toMonitoringConfig(toServersConfig(inventory)).hosts;
  const rawHost = hosts.find((host) => host.id === provider.server && host.enabled !== false);
  if (!rawHost) throw new Error(`Docker server ${provider.server} is not configured or enabled.`);
  const host = resolveMonitoringHost(rawHost);
  const containers = await (options.dockerRequest ?? dockerApiRequest)(host.connection, "/containers/json?all=1", {
    timeoutMs: provider["timeout-ms"] ?? options.timeoutMs
  });
  return {
    targets: containers.map((container) => ({
      id: container.Id,
      kind: "container",
      name: (container.Names?.[0] ?? container.Id.slice(0, 12)).replace(/^\//, ""),
      state: container.State ?? "unknown",
      serverId: provider.server,
      image: container.Image ?? "",
      labelKeys: Object.keys(container.Labels ?? {}).sort()
    })),
    routes: []
  };
}

async function discoverReverseProxy(provider, environment, options) {
  const token = provider["token-env"] ? environment[provider["token-env"]] : undefined;
  if (provider["token-env"] && !token) throw new Error(`Environment variable ${provider["token-env"]} is not set.`);
  const requestOptions = {
    timeoutMs: provider["timeout-ms"] ?? options.timeoutMs,
    token,
    tokenPrefix: provider["token-prefix"] ?? "Bearer ",
    rejectUnauthorized: provider["reject-unauthorized"] !== false,
    requestImpl: options.requestImpl
  };
  const get = options.jsonRequest ?? jsonRequest;
  const adapters = {
    traefik: async () => normalizeTraefik(await get(endpoint(provider.url, "/api/http/routers"), requestOptions), provider.id),
    caddy: async () => normalizeCaddy(await get(endpoint(provider.url, "/config/apps/http/servers"), requestOptions), provider.id),
    "nginx-proxy-manager": async () => normalizeNpm(await get(endpoint(provider.url, "/api/nginx/proxy-hosts"), requestOptions), provider.id)
  };
  const adapter = adapters[provider.driver];
  if (!adapter) throw new Error(`Unsupported reverse proxy driver: ${provider.driver}`);
  return { targets: [], routes: await adapter() };
}

export function calculateDrift(inventory, snapshots) {
  const configured = toServicesConfig(inventory).groups.flatMap((group) => group.panels.flatMap((panel) =>
    panel.items.flatMap((service) => {
      try {
        const url = new URL(service.url);
        return [{
          id: `${group.id}:${service.id ?? service.url}`, serviceId: service.id,
          name: service.name, hostname: normalizeDomain(url.hostname), url: service.url
        }];
      } catch { return []; }
    })
  ));
  const routeSnapshots = snapshots.filter((snapshot) => snapshot.status === "up" && snapshot.provider.type === "reverse-proxy");
  const discovered = routeSnapshots.flatMap((snapshot) => snapshot.routes.map((item) => ({ ...item, providerId: snapshot.provider.id })));
  const configuredHosts = new Set(configured.map((item) => item.hostname));
  const authoritative = routeSnapshots.some((snapshot) => snapshot.provider.authoritative);
  const items = configured.map((item) => {
    const matches = discovered.filter((route) => route.hostname === item.hostname);
    const changed = matches.some((match) => match.metadata?.enabled === false
      || ["disabled", "warning"].includes(String(match.metadata?.status ?? "").toLowerCase()));
    return { ...item, state: matches.length ? (changed ? "changed" : "managed") : authoritative ? "missing" : "unknown" };
  });
  discovered.filter((item) => !configuredHosts.has(item.hostname)).forEach((item) => items.push({
    id: item.id, name: friendlyServiceName(item), hostname: item.hostname, url: item.url,
    providerId: item.providerId, metadata: item.metadata, state: "unmanaged"
  }));
  const summary = { managed: 0, missing: 0, unmanaged: 0, changed: 0, unknown: 0 };
  items.forEach((item) => { summary[item.state] += 1; });
  const usedSuggestionIds = new Set(configured.map((item) => item.serviceId).filter(Boolean));
  const suggestions = items.filter((item) => item.state === "unmanaged").map((item) => {
    const icon = suggestedIcon(item);
    const shortId = suggestionId(serviceHint(item) || item.hostname);
    let id = shortId;
    if (usedSuggestionIds.has(id)) id = suggestionId(item.hostname);
    for (let suffix = 2; usedSuggestionIds.has(id); suffix += 1) {
      id = `${shortId.slice(0, 60)}-${suffix}`;
    }
    usedSuggestionIds.add(id);
    const dependencies = routeSnapshots.find((snapshot) => snapshot.provider.id === item.providerId)?.provider.dependsOn ?? [];
    return {
      id, name: item.name, url: item.url,
      ...(icon ? { icon } : {}), providerId: item.providerId,
      ...(dependencies.length ? { "depends-on": dependencies } : {})
    };
  });
  return { coverage: routeSnapshots.length ? (authoritative ? "authoritative" : "observed") : "none", summary, items, suggestions };
}

export function buildProviderInventory(inventory, snapshots, drift) {
  const services = toServicesConfig(inventory).groups.flatMap((group) => group.panels.flatMap((panel) =>
    panel.items.flatMap((service) => {
      try {
        return [{
          id: service.id ?? service.url, name: service.name, url: service.url,
          inventoryKey: `${group.id}:${panel.id}:${service.id ?? service.url}`,
          hostname: normalizeDomain(new URL(service.url).hostname),
          groupId: group.id, groupName: group.name, categoryId: panel.id, categoryName: panel.name,
          scope: service.scope === "ignore" ? "ignore" : "include"
        }];
      } catch { return []; }
    })
  ));
  const servers = toServersConfig(inventory).servers.map((server) => ({
    id: server.id, name: server.name, groupId: server.groupId, groupName: server.groupName,
    categoryId: server.categoryId, categoryName: server.category,
    scope: server.scope === "ignore" ? "ignore" : "include",
    enabled: server.enabled !== false
  }));
  const configuredHosts = new Set(services.map((service) => service.hostname));
  const serviceProviders = new Map(services.map((service) => [service.inventoryKey, []]));
  const serverProviders = new Map(servers.map((server) => [server.id, []]));
  const driftByUrl = new Map((drift?.items ?? []).filter((item) => item.url).map((item) => [item.url, item.state]));
  const snapshotsByProvider = new Map(snapshots.map((snapshot) => [snapshot.provider.id, snapshot]));
  const providerSnapshots = (inventory.discovery?.providers ?? []).map((provider) => snapshotsByProvider.get(provider.id) ?? {
    provider: {
      id: provider.id, name: provider.name ?? provider.id, type: provider.type,
      ...(provider.driver ? { driver: provider.driver } : {}),
      ...(provider.server ? { serverId: provider.server } : {}),
      authoritative: provider.authoritative === true
    },
    status: provider.enabled === false ? "disabled" : "unavailable",
    targets: [], routes: []
  });

  const providers = providerSnapshots.map((snapshot) => {
    const providerServices = [];
    const providerServers = [];
    const available = [];
    if (snapshot.provider.type === "reverse-proxy") {
      const routeHosts = new Set(snapshot.routes.map((route) => route.hostname));
      for (const service of services) {
        if (!routeHosts.has(service.hostname)) continue;
        providerServices.push({ ...service, state: driftByUrl.get(service.url) ?? "managed" });
        serviceProviders.get(service.inventoryKey)?.push(snapshot.provider.id);
      }
      for (const route of snapshot.routes) {
        if (configuredHosts.has(route.hostname)) continue;
        available.push({
          id: suggestionId(serviceHint(route) || route.hostname), name: friendlyServiceName(route),
          url: route.url, hostname: route.hostname, state: "available"
        });
      }
    } else if (snapshot.provider.type === "docker" && snapshot.provider.serverId) {
      const server = servers.find((item) => item.id === snapshot.provider.serverId);
      if (server) {
        providerServers.push({
          ...server,
          state: snapshot.status === "up" ? "managed" : snapshot.status === "disabled" ? "disabled" : "unavailable"
        });
        serverProviders.get(server.id)?.push(snapshot.provider.id);
      }
    }
    return {
      provider: snapshot.provider, status: snapshot.status, error: snapshot.error,
      services: providerServices, servers: providerServers, available
    };
  });

  const unassigned = {
    services: services.filter((service) => serviceProviders.get(service.inventoryKey)?.length === 0)
      .map((service) => ({ ...service, state: "configured" })),
    servers: servers.filter((server) => serverProviders.get(server.id)?.length === 0)
      .map((server) => ({ ...server, state: server.enabled ? "configured" : "disabled" }))
  };
  return {
    summary: {
      services: {
        total: services.length,
        inScope: services.filter((service) => service.scope !== "ignore").length,
        ignored: services.filter((service) => service.scope === "ignore").length
      },
      servers: {
        total: servers.length,
        inScope: servers.filter((server) => server.scope !== "ignore" && server.enabled).length,
        ignored: servers.filter((server) => server.scope === "ignore").length,
        disabled: servers.filter((server) => !server.enabled).length
      },
      available: providers.reduce((total, provider) => total + provider.available.length, 0)
    },
    providers,
    unassigned
  };
}

export function createDiscoveryManager(getInventory, options = {}) {
  const ttlMs = options.ttlMs ?? 60000;
  const environment = options.environment ?? process.env;
  let cache;
  let cachedAt = 0;
  let signature = "";
  return async function getDiscovery({ refresh = false } = {}) {
    const inventory = await getInventory();
    const providers = inventory.discovery?.enabled === false ? [] : (inventory.discovery?.providers ?? []).filter((item) => item.enabled !== false);
    const nextSignature = JSON.stringify(providers);
    if (!refresh && cache && signature === nextSignature && Date.now() - cachedAt < ttlMs) return cache;
    const snapshots = await Promise.all(providers.map(async (provider) => {
      const publicProvider = {
        id: provider.id, name: provider.name ?? provider.id, type: provider.type,
        ...(provider.driver ? { driver: provider.driver } : {}),
        ...(provider.server ? { serverId: provider.server } : {}),
        dependsOn: discoveryProviderDependencies(inventory, provider),
        authoritative: provider.authoritative === true
      };
      try {
        const result = provider.type === "docker"
          ? await discoverDocker(provider, inventory, options)
          : await discoverReverseProxy(provider, environment, options);
        return { provider: publicProvider, checkedAt: new Date().toISOString(), status: "up", ...result };
      } catch (error) {
        return { provider: publicProvider, checkedAt: new Date().toISOString(), status: "down", error: cleanError(error), targets: [], routes: [] };
      }
    }));
    const servers = toServersConfig(inventory).servers.map((server) => ({
      id: server.id,
      name: server.name,
      monitoring: server.monitoring?.type ?? (server.monitoring ? "docker" : null),
      remote: server.remote?.protocol ?? null
    }));
    const drift = calculateDrift(inventory, snapshots);
    cache = {
      checkedAt: new Date().toISOString(), snapshots, servers, drift,
      providerInventory: buildProviderInventory(inventory, snapshots, drift)
    };
    cachedAt = Date.now();
    signature = nextSignature;
    return cache;
  };
}
