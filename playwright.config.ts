import config from './apps/web/playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...config,
  testDir: './apps/web/e2e',
  webServer: {
    ...config.webServer,
    command: 'npm run dev -w @discordia/web -- --port 5173',
  },
});

