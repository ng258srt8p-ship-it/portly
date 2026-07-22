import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'npx vite --port 5173',
    port: 5173,
    reuseExistingServer: true,
    timeout: 60000,
  },
  use: {
    baseURL: 'http://localhost:5173',
  },
});
