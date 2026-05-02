// Playwright config — timeouts, reporters, retries, baseURL.
import { defineConfig } from '@playwright/test';
import { BASE_URL } from './config/env';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 2 workers on CI — every test creates its own booking (`fullyParallel: true`
  // is safe); 2 keeps CI fast without overloading restful-booker's free tier.
  workers: process.env.CI ? 2 : undefined,
  // HTML report auto-opens on failure for fast triage; never auto-opens in CI.
  reporter: [['html', { open: 'on-failure' }], ['list']],
  use: {
    baseURL: BASE_URL,
    // Full network detail on failure — open via HTML report's "Trace" link.
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
});
