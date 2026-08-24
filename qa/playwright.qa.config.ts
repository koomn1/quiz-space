import { defineConfig, devices } from '@playwright/test';

const baseURL = (process.env.QA_BASE_URL || 'https://koomn1.github.io/quiz-space/').replace(/\/?$/, '/');

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'qa-report', open: 'never' }]],
  use: {
    baseURL,
    locale: 'ar-EG',
    colorScheme: 'light',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'android-pixel-7', use: { ...devices['Pixel 7'] } },
    { name: 'ios-iphone-13', use: { ...devices['iPhone 13'] } },
  ],
});
