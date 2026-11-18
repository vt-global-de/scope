import { lookup as systemLookup } from "node:dns/promises";

function normalizedOptions(options) {
  if (typeof options === "number") return { family: options };
  if (!options || typeof options !== "object") return {};
  return { ...options };
}

function cacheKey(hostname, options) {
  return JSON.stringify([
    String(hostname).toLowerCase(),
    options.family ?? 0,
    options.hints ?? 0,
    options.all === true,
    options.verbatim
  ]);
}

/**
 * Creates a Node-compatible lookup callback that shares successful DNS results
 * between HTTP, TLS, Docker and remote probes. Concurrent requests for the same
 * hostname also share one in-flight resolver request.
 */
export function createCachedLookup({ ttlMs = 300_000, lookupImpl = systemLookup, now = Date.now } = {}) {
  const safeTtlMs = Math.max(1_000, Number.parseInt(ttlMs, 10) || 300_000);
  const entries = new Map();

  return function cachedLookup(hostname, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const resolvedOptions = normalizedOptions(options);
    const key = cacheKey(hostname, resolvedOptions);
    const current = entries.get(key);
    const timestamp = now();
    if (current?.result && timestamp < current.expiresAt) {
      queueMicrotask(() => deliver(callback, resolvedOptions, current.result));
      return;
    }

    const pending = current?.pending ?? Promise.resolve()
      .then(() => lookupImpl(hostname, resolvedOptions))
      .then((result) => {
        entries.set(key, { result, expiresAt: now() + safeTtlMs });
        return result;
      })
      .catch((error) => {
        if (entries.get(key)?.pending === pending) entries.delete(key);
        throw error;
      });
    if (!current?.pending) entries.set(key, { pending, expiresAt: 0 });
    pending.then(
      (result) => deliver(callback, resolvedOptions, result),
      (error) => callback(error)
    );
  };
}

function deliver(callback, options, result) {
  if (options.all === true) {
    callback(null, result);
    return;
  }
  callback(null, result.address, result.family);
}
