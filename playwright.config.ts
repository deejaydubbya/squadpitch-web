import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the customer happy-path smoke test.
 *
 * Goal: prove the public landing page renders and the Start Free CTA
 * routes to the auth flow. We do NOT exercise live Auth0, Stripe, or
 * social-channel OAuth — those are mocked or stubbed in the spec.
 *
 * Run locally:
 *   npm run test:e2e
 *
 * Run in CI: same command. The webServer stanza below auto-builds and
 * starts `next start` so the test runs against a production-mode build,
 * which catches issues that `next dev` would mask.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Build first, then run the standalone artifact used by production.
    command: 'npm run build && node scripts/start-standalone.mjs',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
