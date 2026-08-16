import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const baseURL = (process.env.PLAYWRIGHT_BASE_URL || 'https://koomn1.github.io/quiz-space/').replace(/\/?$/, '/');
const configuredStorageState = process.env.PLAYWRIGHT_STORAGE_STATE;
const storageState = configuredStorageState && fs.existsSync(configuredStorageState) ? configuredStorageState : undefined;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    storageState,
    locale: 'ar-EG',
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
