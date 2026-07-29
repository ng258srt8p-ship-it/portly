import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

// BASE_URL precedence:
//   1. process.env.BASE_URL (explicit override, e.g. live Cloudflare Pages)
//   2. http://localhost:<PORT|NEXT_PUBLIC_PORT|3002>  (local dev server)
// Set BASE_URL=https://portly-1i0.pages.dev to run E2E against the live deployment.
const getBaseURL = (): string => {
  let base = process.env.BASE_URL || 'https://portly-1i0.pages.dev';
  // Remove any trailing slashes to avoid double slashes when navigating
  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  return base;
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