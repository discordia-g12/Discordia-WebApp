import { test, expect } from '@playwright/test';
import { cleanTestServers } from './helpers';

test.describe('E2E Full-Stack con Backend Real y Base de Datos', () => {
  test.beforeEach(() => {
    cleanTestServers();
  });

  test.afterAll(() => {
    cleanTestServers();
  });

  test('debe iniciar sesión con Auth0 y crear un servidor en el backend real', async ({ page }) => {
    await page.goto('/');

    // 1. Ingresar credenciales reales de Auth0
    const emailInput = page.getByRole('textbox', { name: 'correo electrónico' });
    const passwordInput = page.getByRole('textbox', { name: 'contraseña' });
    const loginButton = page.getByTestId('btn-submit-login');

    await expect(loginButton).toBeEnabled({ timeout: 10000 });

    await emailInput.fill('discordia.chat.service@gmail.com');
    await passwordInput.fill('Password123!');
    await loginButton.click();

    // 2. Esperar a ingresar a la aplicación a través del Gateway
    const serverRail = page.getByRole('navigation', { name: 'Servidores y mensajes directos' });
    await expect(serverRail).toBeVisible({ timeout: 20000 });

    // 3. Abrir modal para crear servidor
    await page.getByRole('button', { name: 'Añadir un servidor' }).click();

    // 4. Completar nombre único para el servidor
    const serverName = `Servidor DB Real ${Date.now().toString().slice(-4)}`;
    await page.getByRole('textbox', { name: 'Nombre del servidor' }).fill(serverName);

    // 5. Enviar creación (le pega a POST /api/v1/servers en Kong Gateway -> Postgres)
    await page.getByRole('button', { name: 'Crear /' }).click();

    // 6. Validar que el servidor fue creado en el backend y ya aparece en el rail
    const serverButton = page.getByRole('button', { name: new RegExp(serverName) });
    await expect(serverButton).toBeVisible({ timeout: 15000 });
  });
});
