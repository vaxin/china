import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/game-web/e2e",
  timeout: 30_000,
  fullyParallel: false,
  // Babylon scenes preload multiple high-resolution sprite sets. Two parallel
  // WebGL contexts keep CI deterministic without hiding failures behind retries.
  workers: 2,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm --filter @empire/game-web preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
      },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
