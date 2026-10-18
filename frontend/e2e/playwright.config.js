import { defineConfig, devices } from "@playwright/test";
import { apiBaseUrl, frontendBaseUrl } from "./env.mjs";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.js/,
  globalSetup: "./global-setup.mjs",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node e2e/start-backend.mjs",
      cwd: "..",
      url: `${apiBaseUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4173",
      cwd: "..",
      url: frontendBaseUrl,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        VITE_API_BASE_URL: apiBaseUrl,
        VITE_CATALOG_API_ENABLED: "true",
      },
    },
  ],
});
