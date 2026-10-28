import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const TEST_USER_ID = 'auth0|6ae25c494d4ba47b0ff49739';

function cleanTestServers() {
  try {
    execSync(
      `docker exec discordia-postgres psql -U postgres -d server_roles_db -c "DELETE FROM servers WHERE owner_id = '${TEST_USER_ID}';"`,
      { stdio: 'ignore' }
    );
  } catch {
    // Si docker no está disponible o en CI sin docker, continúa sin bloquear el test
  }
}

test.describe('Creación de Servidor', () => {
  test.beforeEach(() => {
    cleanTestServers();
  });

  test.afterAll(() => {
    cleanTestServers();
  });

  test('crear un nuevo servidor', async ({ page }) => {
  await page.goto('/');

  // 1. Iniciar sesión con el usuario de pruebas
  const loginButton = page.getByTestId('btn-submit-login');
  await expect(loginButton).toBeEnabled({ timeout: 10000 });

  await page.getByRole('textbox', { name: 'correo electrónico' }).fill('discordia.chat.service@gmail.com');
  await page.getByRole('textbox', { name: 'contraseña' }).fill('Password123!');
  await loginButton.click();

  // Esperar a que ingrese al dashboard
  const serverRail = page.getByRole('navigation', { name: 'Servidores y mensajes directos' });
  await expect(serverRail).toBeVisible({ timeout: 20000 });

  // 2. Abrir modal de añadir servidor
  await page.getByRole('button', { name: 'Añadir un servidor' }).click();

  // 3. Escribir nombre del servidor
  const serverName = `Servidor de PRUEBA ${Date.now().toString().slice(-4)}`;
  await page.getByRole('textbox', { name: 'Nombre del servidor' }).fill(serverName);

  // 4. Confirmar creación
  await page.getByRole('button', { name: 'Crear /' }).click();

  // 5. Verificar que el servidor nuevo aparece en el rail
  await expect(page.getByRole('button', { name: new RegExp(serverName) })).toBeVisible({ timeout: 15000 });
  });
});
