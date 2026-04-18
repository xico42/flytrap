import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "8080";

// No `webServer:` on purpose — `scripts/run-e2e.sh` starts the binary,
// waits for /api/health readiness, and then invokes `playwright test`.
// Adding webServer here would race against that lifecycle.
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
