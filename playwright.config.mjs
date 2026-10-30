import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 15000,
  retries: 1,
  use: {
    baseURL: process.env.SCOPE_BASE_URL ?? "http://127.0.0.1:3000",
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  reporter: [["line"]]
});
