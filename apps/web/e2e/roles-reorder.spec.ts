import { test, expect } from '@playwright/test';
import { cleanTestServers, createServerViaUI, loginWithTestUser } from './helpers';

test.describe('Jerarquía y Reordenamiento de Roles', () => {
  test.beforeEach(() => {
    cleanTestServers();
  });

  test.afterAll(() => {
    cleanTestServers();
  });

  test('debe permitir crear roles y modificar su posición jerárquica con las flechas de orden', async ({ page }) => {
    // 1. Iniciar sesión y crear un servidor para el test
    await loginWithTestUser(page);

    const serverName = `Servidor Roles ${Date.now().toString().slice(-4)}`;
    await createServerViaUI(page, serverName);

    // 2. Abrir el servidor recién creado
    const serverButton = page.getByRole('button', { name: new RegExp(serverName) });
    await serverButton.click();

    // 3. Abrir el menú del servidor y navegar a Ajustes del servidor
    const menuButton = page.getByRole('button', { name: `Menú del servidor ${serverName}` });
    await expect(menuButton).toBeVisible({ timeout: 10000 });
    await menuButton.click();

    await page.getByRole('menuitem', { name: 'Ajustes del servidor' }).click();

    const settingsDialog = page.getByRole('dialog', { name: 'Ajustes del servidor' });
    await expect(settingsDialog).toBeVisible({ timeout: 10000 });

    // 4. Seleccionar la sección de Roles
    await settingsDialog.getByRole('button', { name: 'Roles' }).click();
    await expect(settingsDialog.getByRole('region', { name: 'Crear rol' })).toBeVisible();

    // 5. Crear el primer rol: "Moderador"
    await settingsDialog.getByRole('textbox', { name: 'nombre del rol' }).fill('Moderador');
    await settingsDialog.getByRole('button', { name: 'Crear rol /' }).click();
    await expect(settingsDialog.getByTestId('role-item-Moderador')).toBeVisible({ timeout: 10000 });

    // 6. Crear el segundo rol: "VIP"
    await settingsDialog.getByRole('textbox', { name: 'nombre del rol' }).fill('VIP');
    await settingsDialog.getByRole('button', { name: 'Crear rol /' }).click();
    await expect(settingsDialog.getByTestId('role-item-VIP')).toBeVisible({ timeout: 10000 });

    // 7. Validar el orden inicial: @everyone en posición 0, Moderador en 1, VIP en 2
    const roleList = settingsDialog.getByTestId('role-list');
    const items = roleList.locator('li');
    await expect(items.nth(0)).toContainText('@everyone');
    await expect(items.nth(1)).toContainText('Moderador');
    await expect(items.nth(2)).toContainText('VIP');

    // 8. Reordenar: subir VIP una posición (intercambia con Moderador)
    const moveUpVIP = settingsDialog.getByRole('button', { name: 'Subir VIP' });
    await expect(moveUpVIP).toBeEnabled();
    await moveUpVIP.click();

    // 9. Validar que VIP ahora está en la posición 1 y Moderador en la 2
    await expect(items.nth(1)).toContainText('VIP');
    await expect(items.nth(2)).toContainText('Moderador');

    // 10. Reordenar: bajar VIP una posición (vuelve al orden anterior)
    const moveDownVIP = settingsDialog.getByRole('button', { name: 'Bajar VIP' });
    await expect(moveDownVIP).toBeEnabled();
    await moveDownVIP.click();

    await expect(items.nth(1)).toContainText('Moderador');
    await expect(items.nth(2)).toContainText('VIP');
  });
});

