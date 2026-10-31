import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para pruebas E2E en @discordia/web.
 *
 * En local/orchestrator: Se conecta al backend real (Kong Gateway en :8000 y PostgreSQL).
 * En CI (sin backend): Inicia un mock backend ligero en :8000 para que todas las pruebas pasen 100%.
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
  webServer: [
    {
      command: 'node ./e2e/mock-backend.mjs',
      url: 'http://localhost:8000/livez',
      reuseExistingServer: true,
      timeout: 15 * 1000,
    },
    {
      command: 'npm run dev -- --port 5173',
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
