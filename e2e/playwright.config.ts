import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTestDatabaseUrl } from "./lib/test-db";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(e2eDir, "..", "server");
const clientDir = path.resolve(e2eDir, "..", "client");

const apiPort = Number(process.env.E2E_API_PORT ?? 3100);
const clientPort = Number(process.env.E2E_CLIENT_PORT ?? 5174);
const apiOrigin = `http://localhost:${apiPort}`;
const clientOrigin = `http://localhost:${clientPort}`;
const testDatabaseUrl = getTestDatabaseUrl();

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: clientOrigin,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      name: "api",
      // Run the entry directly: `bun run start` prefixes NODE_ENV=production
      // in its package.json script, which would override the NODE_ENV=test
      // below and turn rate limiting on mid-suite (429s).
      command: "bun src/index.ts",
      cwd: serverDir,
      url: `${apiOrigin}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        NODE_ENV: "test",
        PORT: String(apiPort),
        DATABASE_URL: testDatabaseUrl,
        TRUSTED_ORIGIN: clientOrigin,
        BETTER_AUTH_URL: apiOrigin,
      },
    },
    {
      name: "client",
      command: `bunx vite --port ${clientPort} --strictPort`,
      cwd: clientDir,
      url: clientOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        API_PROXY_TARGET: apiOrigin,
      },
    },
  ],
});
