import { defineConfig } from '@playwright/test';

/**
 * Playwright Configuration for Hive Wellness Platform
 * 
 * This configuration runs API-level tests without browser automation
 * due to Replit environment limitations with graphical dependencies.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/api-tests.spec.ts', // Only run API tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://0.0.0.0:5000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://0.0.0.0:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
