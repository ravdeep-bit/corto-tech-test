import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './config/env';

// Timeouts centralised — values absorb demoqa's variable response times without masking failures.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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

  // Chromium default. Firefox/WebKit via `npm run test:cross-browser`.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
