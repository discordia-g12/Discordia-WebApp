import { Page, expect } from '@playwright/test';
import { execSync } from 'child_process';

export const TEST_USER_EMAIL = 'discordia.chat.service@gmail.com';
export const TEST_USER_PASSWORD = 'Password123!';
export const TEST_USER_ID = 'auth0|6ae25c494d4ba47b0ff49739';

/**
 * Limpia los servidores de prueba generados por el usuario para asegurar aislamiento total.
 */
export function cleanTestServers() {
  try {
    execSync(
      `docker exec discordia-postgres psql -U postgres -d server_roles_db -c "DELETE FROM servers WHERE owner_id = '${TEST_USER_ID}';"`,
      { stdio: 'ignore' }
    );
  } catch {
    // Continúa silenciosamente si docker no está en el host actual
  }
  try {
    execSync(`curl -s -X DELETE http://localhost:8000/api/v1/servers/test-reset`, { stdio: 'ignore' });
  } catch {
    // Continúa silenciosamente si no responde
  }
}

/**
 * Inicia sesión completa con el usuario de pruebas verificado.
 */
export async function loginWithTestUser(page: Page) {
  await page.goto('/');

  const loginButton = page.getByTestId('btn-submit-login');
  await expect(loginButton).toBeEnabled({ timeout: 10000 });

  await page.getByRole('textbox', { name: 'correo electrónico' }).fill(TEST_USER_EMAIL);
  await page.getByRole('textbox', { name: 'contraseña' }).fill(TEST_USER_PASSWORD);
  await loginButton.click();

  const serverRail = page.getByRole('navigation', { name: 'Servidores y mensajes directos' });
  await expect(serverRail).toBeVisible({ timeout: 20000 });
}

/**
 * Crea un servidor a través del modal y espera su renderizado en el ServerRail.
 */
export async function createServerViaUI(page: Page, serverName: string) {
  await page.getByRole('button', { name: 'Añadir un servidor' }).click();
  await page.getByRole('textbox', { name: 'Nombre del servidor' }).fill(serverName);
  await page.getByRole('button', { name: 'Crear /' }).click();
  await expect(page.getByRole('button', { name: new RegExp(serverName) })).toBeVisible({ timeout: 15000 });
}

