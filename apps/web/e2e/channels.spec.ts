import { test, expect } from '@playwright/test';
import { cleanTestServers, createServerViaUI, loginWithTestUser } from './helpers';

test.describe('Gestión de Canales y Categorías', () => {
  test.beforeEach(() => {
    cleanTestServers();
  });

  test.afterAll(() => {
    cleanTestServers();
  });

  test('debe crear un nuevo canal de texto y una nueva categoría en el servidor', async ({ page }) => {
    // 1. Iniciar sesión y crear un servidor para el test
    await loginWithTestUser(page);

    const serverName = `Servidor Canales ${Date.now().toString().slice(-4)}`;
    await createServerViaUI(page, serverName);

    // 2. Abrir el servidor recién creado
    const serverButton = page.getByRole('button', { name: new RegExp(serverName) });
    await serverButton.click();

    // 3. Abrir el menú del servidor
    const menuButton = page.getByRole('button', { name: `Menú del servidor ${serverName}` });
    await expect(menuButton).toBeVisible({ timeout: 10000 });
    await menuButton.click();

    // 4. Crear un nuevo canal de texto
    await page.getByRole('menuitem', { name: 'Crear canal' }).click();

    const channelModal = page.getByRole('dialog', { name: 'Crear canal' });
    await expect(channelModal).toBeVisible();

    const channelName = 'avisos-e2e';
    await page.getByRole('textbox', { name: 'Nombre del canal' }).fill(channelName);
    await channelModal.getByRole('button', { name: 'Crear /' }).click();

    // 5. Validar que el canal nuevo aparece en la barra de canales
    await expect(page.getByText(channelName)).toBeVisible({ timeout: 15000 });

    // 6. Crear una nueva categoría
    await menuButton.click();
    await page.getByRole('menuitem', { name: 'Crear categoría' }).click();

    const categoryModal = page.getByRole('dialog', { name: 'Crear categoría' });
    await expect(categoryModal).toBeVisible();

    const categoryName = 'ANUNCIOS';
    await page.getByRole('textbox', { name: 'Nombre de la categoría' }).fill(categoryName);
    await categoryModal.getByRole('button', { name: 'Crear /' }).click();

    // 7. Validar que la categoría aparece en el sidebar
    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 15000 });
  });
});
