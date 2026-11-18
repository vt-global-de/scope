import assert from "node:assert/strict";
import test from "node:test";
import { createCachedLookup } from "../src/dns-cache.mjs";

function lookup(cachedLookup, hostname, options = {}) {
  return new Promise((resolve, reject) => cachedLookup(hostname, options, (error, address, family) => {
    if (error) reject(error);
    else resolve(options.all ? address : { address, family });
  }));
}

test("shares cached and concurrent DNS lookups until the TTL expires", async () => {
  let calls = 0;
  let time = 1_000;
  const cachedLookup = createCachedLookup({
    ttlMs: 5_000,
    now: () => time,
    lookupImpl: async () => {
      calls += 1;
      await Promise.resolve();
      return { address: "192.0.2.10", family: 4 };
    }
  });

  assert.deepEqual(await Promise.all([
    lookup(cachedLookup, "scope.example.test"),
    lookup(cachedLookup, "scope.example.test")
  ]), [
    { address: "192.0.2.10", family: 4 },
    { address: "192.0.2.10", family: 4 }
  ]);
  assert.equal(calls, 1);

  await lookup(cachedLookup, "scope.example.test");
  assert.equal(calls, 1);
  time += 5_001;
  await lookup(cachedLookup, "scope.example.test");
  assert.equal(calls, 2);
});

test("preserves the all-addresses lookup contract", async () => {
  const addresses = [{ address: "192.0.2.10", family: 4 }, { address: "2001:db8::10", family: 6 }];
  const cachedLookup = createCachedLookup({ lookupImpl: async () => addresses });
  assert.deepEqual(await lookup(cachedLookup, "scope.example.test", { all: true }), addresses);
});
