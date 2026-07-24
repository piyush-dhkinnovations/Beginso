import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests for the public form pipeline (Sprint 3). Runs against `next dev` on a
 * dedicated port, with the backend mocked via route interception (see e2e/mockBackend.ts)
 * so tests are deterministic and don't depend on the real backend's availability,
 * rate limits, or current bugs — those are tracked separately in markdown/backend_bugs_*.md.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'node e2e/mockServer.ts',
      url: 'http://localhost:3101/api/public/mock-valid',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'npx next dev -p 3100',
      url: 'http://localhost:3100',
      env: { NEXT_PUBLIC_API_URL: 'http://localhost:3101' },
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
