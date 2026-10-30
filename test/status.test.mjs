import assert from "node:assert/strict";
import test from "node:test";
import { checkUrl, classifyHttpStatus, parseHttpUrl } from "../src/status.mjs";

test("accepts only HTTP URLs", () => {
  assert.equal(parseHttpUrl("https://example.com").hostname, "example.com");
  assert.equal(parseHttpUrl("javascript:alert(1)"), null);
  assert.equal(parseHttpUrl(""), null);
});

test("classifies HTTP responses", () => {
  assert.equal(classifyHttpStatus(200), "up");
  assert.equal(classifyHttpStatus(302), "up");
  assert.equal(classifyHttpStatus(401), "up");
  assert.equal(classifyHttpStatus(404), "down");
  assert.equal(classifyHttpStatus(503), "down");
});

test("marks invalid configuration without making a request", async () => {
  const result = await checkUrl("wrong", { fetchImpl: () => assert.fail("fetch must not run") });
  assert.equal(result.status, "down");
});

for (const headStatus of [400, 405, 501, 502]) {
  test(`retries HEAD ${headStatus} with GET`, async () => {
    const methods = [];
    const result = await checkUrl("https://example.com", {
      fetchImpl: async (_url, options) => {
        methods.push(options.method);
        return { status: options.method === "HEAD" ? headStatus : 200 };
      }
    });

    assert.deepEqual(methods, ["HEAD", "GET"]);
    assert.equal(result.status, "up");
    assert.equal(result.httpStatus, 200);
  });
}

test("keeps an actual server error down after GET verification", async () => {
  const methods = [];
  const result = await checkUrl("https://example.com", {
    fetchImpl: async (_url, options) => {
      methods.push(options.method);
      return { status: 503 };
    }
  });

  assert.deepEqual(methods, ["HEAD", "GET"]);
  assert.equal(result.status, "down");
  assert.equal(result.httpStatus, 503);
});
