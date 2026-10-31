import { test, expect } from '@playwright/test';
import { cleanTestServers, createServerViaUI, loginWithTestUser } from './helpers';

test.describe('Generación de Invitaciones de Servidor', () => {
  test.beforeEach(() => {
    cleanTestServers();
  });

  test.afterAll(() => {
    cleanTestServers();
  });

  test('debe abrir el modal de invitar y generar un enlace de invitación válido', async ({ page }) => {
    // 1. Iniciar sesión y crear un servidor
    await loginWithTestUser(page);

    const serverName = `Servidor Invitaciones ${Date.now().toString().slice(-4)}`;
    await createServerViaUI(page, serverName);

    // 2. Abrir el servidor
    const serverButton = page.getByRole('button', { name: new RegExp(serverName) });
    await serverButton.click();

    // 3. Tocar el botón de invitar en la barra lateral
    const inviteButton = page.getByRole('button', { name: /Invitar al servidor/i });
    await expect(inviteButton).toBeVisible({ timeout: 10000 });
    await inviteButton.click();

    // 4. Validar que el modal de invitación se muestra
    const inviteModal = page.getByRole('dialog', { name: 'Invitar' });
    await expect(inviteModal).toBeVisible();

    // 5. Validar que se generó el enlace con código de invitación
    const inviteInput = page.locator('#invite-link');
    await expect(inviteInput).toBeVisible();
    await expect(inviteInput).toHaveValue(/\/invite\/[a-zA-Z0-9_-]+/, { timeout: 15000 });

    // 6. Cerrar el modal
    await page.getByRole('button', { name: 'Cerrar: Invitar' }).click();
    await expect(inviteModal).not.toBeVisible();
  });
});

