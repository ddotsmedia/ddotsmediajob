import { defineConfig, devices } from '@playwright/test';

// E2E config. NOTE: the readiness probe hits /saved, not / — the homepage and
// /jobs do server-side data fetches that stall for ~45s when Redis is unreachable
// (e.g. local dev without redis-server), which would hang server startup. /saved
// is a static shell + client fetch, so it returns 200 immediately.
//
// Data-dependent specs (homepage/search) need Redis running; they pass in CI
// (redis service) and locally only when redis-server is up. The /saved spec runs
// anywhere.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Chromium runs everywhere; the fuller cross-browser + mobile matrix runs in CI
  // (where all browsers are installed) so a bare local `pnpm test:e2e` doesn't fail
  // on uninstalled firefox/webkit engines.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(process.env.CI
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
          { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
        ]
      : []),
  ],
  webServer: {
    command: 'pnpm --filter @ddots/web dev',
    url: 'http://localhost:3000/saved',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
