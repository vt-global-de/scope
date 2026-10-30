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

function nativeRequest(url, method, timeoutMs, rejectUnauthorized) {
  return new Promise((resolve, reject) => {
    const requestImpl = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = requestImpl(url, {
      method,
      headers: { "User-Agent": "Scope/1.0 status-check" },
      ...(url.protocol === "https:" ? { rejectUnauthorized } : {})
    }, (response) => {
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

async function request(url, method, fetchImpl, timeoutMs, rejectUnauthorized) {
  if (!fetchImpl) return nativeRequest(url, method, timeoutMs, rejectUnauthorized);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "Scope/1.0 status-check" }
    });
    await response.body?.cancel().catch(() => {});
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkUrl(value, { fetchImpl, timeoutMs = 4000, rejectUnauthorized = true } = {}) {
  const url = parseHttpUrl(value);
  if (!url) {
    return { status: "down", detail: "URL fehlt oder ist ungültig" };
  }

  try {
    let response = await request(url, "HEAD", fetchImpl, timeoutMs, rejectUnauthorized);
    if (classifyHttpStatus(response.status) === "down") {
      response = await request(url, "GET", fetchImpl, timeoutMs, rejectUnauthorized);
    }

    return {
      status: classifyHttpStatus(response.status),
      httpStatus: response.status,
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
          url: item.url,
          rejectUnauthorized: item.certificates?.["reject-unauthorized"] !== false
        }))
      )
    );
    const signature = JSON.stringify(targets.map(({ url, rejectUnauthorized }) => ({ url, rejectUnauthorized })));
    const now = Date.now();

    if (cachedResults && signature === cachedSignature && now - cachedAt < ttlMs) {
      return cachedResults;
    }
    if (pendingCheck && signature === cachedSignature) return pendingCheck;

    cachedSignature = signature;
    const currentCheck = mapWithConcurrency(targets, options.concurrency ?? 8,
      async ({ id, name, groupIndex, panelIndex, itemIndex, url, rejectUnauthorized }) => ({
        id, name, groupIndex, panelIndex, itemIndex,
        ...(await checkUrl(url, { ...options, rejectUnauthorized }))
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
