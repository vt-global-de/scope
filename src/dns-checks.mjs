import { Resolver } from "node:dns/promises";
import { mapWithConcurrency } from "./check-runner.mjs";

const recordTypes = new Set(["A", "AAAA", "CNAME", "MX", "TXT", "SRV"]);
const isText = (value) => typeof value === "string" && value.trim().length > 0;

export function validateDnsChecks(checks) {
  const ids = new Set();
  checks.forEach((check, index) => {
    const path = `dns[${index}]`;
    if (!check || !isText(check.id) || !/^[a-z0-9][a-z0-9_-]*$/.test(check.id)) throw new Error(`${path}.id ist ungültig.`);
    if (ids.has(check.id)) throw new Error(`${path}.id ist doppelt vergeben.`);
    ids.add(check.id);
    if (!isText(check.name) || !isText(check.hostname)) throw new Error(`${path} benötigt name und hostname.`);
    if (!recordTypes.has(check.type ?? "A")) throw new Error(`${path}.type wird nicht unterstützt.`);
    if (check.resolvers !== undefined && (!Array.isArray(check.resolvers) || check.resolvers.some((value) => !isText(value)))) {
      throw new Error(`${path}.resolvers muss eine Liste sein.`);
    }
    if (check.expected !== undefined && (!Array.isArray(check.expected) || check.expected.some((value) => !isText(value)))) {
      throw new Error(`${path}.expected muss eine Liste sein.`);
    }
  });
  return checks;
}

function normalizeAnswer(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join("");
  if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `${key}=${item}`).join(" ");
  return String(value);
}

export async function checkDns(check, { timeoutMs = 4000, resolverFactory = () => new Resolver() } = {}) {
  const resolver = resolverFactory();
  if (check.resolvers?.length) resolver.setServers(check.resolvers);
  const type = check.type ?? "A";
  try {
    const answers = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("DNS-Zeitüberschreitung")), timeoutMs);
      resolver.resolve(check.hostname, type).then(resolve, reject).finally(() => clearTimeout(timeout));
    });
    const normalized = answers.map(normalizeAnswer);
    const expected = check.expected ?? [];
    const matches = expected.length === 0 || expected.every((value) => normalized.includes(value));
    return {
      id: check.id, name: check.name, environment: check.environment, hostname: check.hostname, type, owner: check.owner,
      status: matches ? "up" : "down",
      detail: matches ? `${normalized.length} Antwort(en)` : "Erwartete DNS-Antwort fehlt",
      answers: normalized,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      id: check.id, name: check.name, environment: check.environment, hostname: check.hostname, type, owner: check.owner,
      status: "down", detail: String(error.message).slice(0, 180), answers: [], checkedAt: new Date().toISOString()
    };
  }
}

export function createDnsChecker(getChecks, options = {}) {
  const ttlMs = options.ttlMs ?? 30000;
  let cache;
  let cachedAt = 0;
  let signature = "";
  return async function getDnsStatuses() {
    const checks = await getChecks();
    const nextSignature = JSON.stringify(checks);
    if (cache && signature === nextSignature && Date.now() - cachedAt < ttlMs) return cache;
    signature = nextSignature;
    cache = await mapWithConcurrency(checks, options.concurrency ?? 8, (check) => checkDns(check, options));
    cachedAt = Date.now();
    return cache;
  };
}
