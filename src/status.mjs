import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { getDashboardPanels } from "./config.mjs";
import { mapWithConcurrency } from "./check-runner.mjs";

const reachableHttpStatuses = new Set([401, 403, 429]);

export function parseHttpUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return null;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

export function classifyHttpStatus(httpStatus) {
  if ((httpStatus >= 200 && httpStatus < 400) || reachableHttpStatuses.has(httpStatus)) {
    return "up";
  }
  return "down";
}

function nativeRequest(url, method, timeoutMs, rejectUnauthorized, followRedirects, remainingRedirects = 5) {
  return new Promise((resolve, reject) => {
    const requestImpl = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = requestImpl(url, {
      method,
      headers: { "User-Agent": "Scope/1.0 status-check" },
      ...(url.protocol === "https:" ? { rejectUnauthorized } : {})
    }, (response) => {
      if (followRedirects && remainingRedirects > 0 && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        const redirected = new URL(response.headers.location, url);
        nativeRequest(redirected, method, timeoutMs, rejectUnauthorized, true, remainingRedirects - 1).then(resolve, reject);
        return;
      }
      response.resume();
      resolve({ status: response.statusCode ?? 0 });
    });
    request.setTimeout(timeoutMs, () => {
      const error = new Error("Request timed out");
      error.name = "AbortError";
      request.destroy(error);
    });
    request.once("error", reject);
    request.end();
  });
}

async function request(url, method, fetchImpl, timeoutMs, rejectUnauthorized, followRedirects) {
  if (!fetchImpl) return nativeRequest(url, method, timeoutMs, rejectUnauthorized, followRedirects);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method,
      redirect: followRedirects ? "follow" : "manual",
      signal: controller.signal,
      headers: { "User-Agent": "Scope/1.0 status-check" }
    });
    await response.body?.cancel().catch(() => {});
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkUrl(value, {
  fetchImpl, timeoutMs = 4000, rejectUnauthorized = true, method, expectedStatuses, followRedirects = false
} = {}) {
  const url = parseHttpUrl(value);
  if (!url) {
    return { status: "down", detail: "URL fehlt oder ist ungültig" };
  }

  try {
    const started = performance.now();
    let response = await request(url, method ?? "HEAD", fetchImpl, timeoutMs, rejectUnauthorized, followRedirects);
    if (!method && classifyHttpStatus(response.status) === "down") {
      response = await request(url, "GET", fetchImpl, timeoutMs, rejectUnauthorized, followRedirects);
    }
    const status = expectedStatuses?.length
      ? (expectedStatuses.includes(response.status) ? "up" : "down")
      : classifyHttpStatus(response.status);

    return {
      status,
      httpStatus: response.status,
      responseTimeMs: Math.round(performance.now() - started),
      detail: `HTTP ${response.status}`
    };
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return {
      status: "down",
      detail: timedOut ? "Zeitüberschreitung" : "Nicht erreichbar"
    };
  }
}

export function createStatusChecker(getConfig, options = {}) {
  const ttlMs = options.ttlMs ?? 30000;
  let cachedResults;
  let cachedAt = 0;
  let cachedSignature = "";
  let pendingCheck;

  return async function getStatuses() {
    const config = await getConfig();
    const targets = config.groups.flatMap((group, groupIndex) =>
      getDashboardPanels(group).flatMap((panel, panelIndex) =>
        panel.items.map((item, itemIndex) => ({
          id: `${group.id ?? groupIndex}:${item.id ?? item.url}`,
          name: item.name,
          groupIndex,
          panelIndex,
          itemIndex,
          url: (() => {
            if (!item.health?.path) return item.url;
            try { const target = new URL(item.url); target.pathname = item.health.path; return target.toString(); }
            catch { return item.url; }
          })(),
          health: item.health,
          rejectUnauthorized: item.certificates?.["reject-unauthorized"] !== false
        }))
      )
    );
    const signature = JSON.stringify(targets.map(({ url, rejectUnauthorized, health }) => ({ url, rejectUnauthorized, health })));
    const now = Date.now();

    if (cachedResults && signature === cachedSignature && now - cachedAt < ttlMs) {
      return cachedResults;
    }
    if (pendingCheck && signature === cachedSignature) return pendingCheck;

    cachedSignature = signature;
    const currentCheck = mapWithConcurrency(targets, options.concurrency ?? 8,
      async ({ id, name, groupIndex, panelIndex, itemIndex, url, rejectUnauthorized, health }) => ({
        id, name, groupIndex, panelIndex, itemIndex,
        ...(await checkUrl(url, {
          ...options,
          timeoutMs: health?.["timeout-ms"] ?? options.timeoutMs,
          rejectUnauthorized,
          method: health?.method,
          expectedStatuses: health?.["expected-status"],
          followRedirects: health?.["follow-redirects"] === true
        }))
      }));
    pendingCheck = currentCheck;

    try {
      const results = await currentCheck;
      if (signature === cachedSignature) {
        cachedResults = results;
        cachedAt = Date.now();
      }
      return results;
    } finally {
      if (pendingCheck === currentCheck) pendingCheck = undefined;
    }
  };
}
