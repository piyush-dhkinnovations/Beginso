import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests for the public form pipeline (Sprint 3). Runs against `next dev` on a
 * dedicated port, with the backend mocked via route interception (see e2e/mockBackend.ts)
 * so tests are deterministic and don't depend on the real backend's availability,
 * rate limits, or current bugs — those are tracked separately in docs/backend-contract/known-issues/.
 */
// Ports can be moved with E2E_PORT (the app) and E2E_MOCK_PORT (the mock backend) when 3100/3101 are taken.
// A server that is already listening is NOT reused unless E2E_REUSE_SERVER=1: reusing whatever answers on the
// port once ran the whole suite against a different project's dev server and failed with a misleading page.
const APP_PORT = Number(process.env.E2E_PORT ?? 3100);
const MOCK_PORT = Number(process.env.E2E_MOCK_PORT ?? 3101);
const reuseExistingServer = process.env.E2E_REUSE_SERVER === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Next dev recompiles route/font modules per worker. A bounded pool keeps the
  // suite deterministic on local Windows machines and avoids resource thrash.
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The suite runs on `next dev`, which compiles a route the first time it is visited. On a CI runner with four workers hitting the
  // builder page at once that compile alone can take most of a minute, and the specs themselves wait up to 60s for the page: with
  // Playwright's default 30s per test the first builder test timed out before its own wait could finish. A genuine hang still fails.
  timeout: 90_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'node e2e/mockServer.ts',
      url: `http://localhost:${MOCK_PORT}/api/public/mock-valid`,
      env: { E2E_MOCK_PORT: String(MOCK_PORT) },
      reuseExistingServer,
      timeout: 30000,
    },
    {
      // Launch Node directly so Playwright can terminate the server process tree
      // reliably on Windows after the tests finish.
      command: `node node_modules/next/dist/bin/next dev -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      env: { NEXT_PUBLIC_API_URL: `http://localhost:${MOCK_PORT}`, NEXT_DIST_DIR: '.next-e2e' },
      reuseExistingServer,
      timeout: 60000,
    },
  ],
});
