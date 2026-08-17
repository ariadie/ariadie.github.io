import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }]
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node tools/serve-site.mjs",
    url: "http://127.0.0.1:4173/robots.txt",
    reuseExistingServer: true,
    timeout: 15000
  }
});
