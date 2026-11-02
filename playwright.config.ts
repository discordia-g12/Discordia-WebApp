import config from './apps/web/playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...config,
  testDir: './apps/web/e2e',
  webServer: [
    {
      command: 'node ./apps/web/e2e/mock-backend.mjs',
      url: 'http://localhost:8000/livez',
      reuseExistingServer: true,
      timeout: 15 * 1000,
    },
    {
      command: 'npm run dev -w @discordia/web -- --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_USE_MOCK: 'false',
        VITE_API_URL: 'http://localhost:8000',
      },
      timeout: 60 * 1000,
    },
  ],
});
