import { defineConfig, devices } from '@playwright/test';

const getPortFromEnv = (): number => {
  const fromEnv = parseInt(process.env.PORT || process.env.NEXT_PUBLIC_PORT || '0', 10);
  if (fromEnv > 0) return fromEnv;
  return 3002; // default to the actual running dev server
};
const BASE_URL = `http://localhost:${getPortFromEnv()}`;

export default defineConfig({
 testDir: './e2e',
 fullyParallel: true,
 forbidOnly: !!process.env.CI,
 retries: process.env.CI ? 2 : 0,
 workers: process.env.CI ? 1 : undefined,
 reporter: 'html',
 timeout: 60000,
 use: {
   baseURL: BASE_URL,
   trace: 'on-first-retry',
   screenshot: 'only-on-failure',
   video: 'retain-on-failure',
 },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
    },
  },
});