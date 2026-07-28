import { defineConfig, devices } from '@playwright/test';

// BASE_URL precedence:
//   1. process.env.BASE_URL (explicit override, e.g. live Cloudflare Pages)
//   2. http://localhost:<PORT|NEXT_PUBLIC_PORT|3002>  (local dev server)
// Set BASE_URL=https://portly-1i0.pages.dev/ to run E2E against the live deployment.
const getBaseURL = (): string => {
  if (process.env.BASE_URL && process.env.BASE_URL.length > 0) {
    return process.env.BASE_URL;
  }
  const fromEnv = parseInt(process.env.PORT || process.env.NEXT_PUBLIC_PORT || '0', 10);
  const port = fromEnv > 0 ? fromEnv : 3002;
  return `http://localhost:${port}`;
};
const BASE_URL = getBaseURL();

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