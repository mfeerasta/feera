import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright is used for a11y smoke testing only at this point. It hits the
 * live target URL set (A11Y_TARGET_URL or production) and runs axe-core
 * against each page.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-results/html' }]],
  outputDir: 'test-results',
  timeout: 60_000,
  use: {
    baseURL: process.env.A11Y_TARGET_URL ?? 'https://www.feera.ai',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
