import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para pruebas E2E Full-Stack en @discordia/web.
 *
 * Se conecta al backend real (Kong Gateway en http://localhost:8000)
 * y a la base de datos PostgreSQL local en Docker.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    env: {
      VITE_USE_MOCK: 'false',
      VITE_API_URL: 'http://localhost:8000',
    },
    timeout: 60 * 1000,
  },
});
