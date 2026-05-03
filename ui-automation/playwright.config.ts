import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './config/env';

// Timeouts centralised — values absorb demoqa's variable response times without masking failures.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // workers: 1 — demoqa enforces single session per user, so two logged-in
  // tests running in parallel would race each other into auth failures (a
  // new login on the shared `tester` account invalidates the older token).
  // Storage state isn't a workaround — see `tests/logged-in/e2e-flow.spec.ts`
  // header for the three demoqa quirks that defeat it (single-session,
  // mismatched-token sensitivity, cookie/localStorage gap).
  // To scale beyond serial execution, switch to per-test user registration
  // via `POST /Account/v1/User` (deterministic via isolation, not via locking).
  workers: 1,
  // HTML report auto-opens on failure for fast triage; never auto-opens in CI.
  reporter: [['html', { open: 'on-failure' }], ['list']],

  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: { mode: 'only-on-failure', fullPage: true },
    video: 'retain-on-failure',
  },

  // Chromium default for fast local + CI runs. Other projects opt-in via npm scripts:
  //   `test:cross-browser` → all desktop browsers
  //   `test:mobile`        → Pixel 5 (Chrome) + iPhone 13 (Safari)
  // demoqa is responsive; existing specs are designed to work across viewports.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
});
