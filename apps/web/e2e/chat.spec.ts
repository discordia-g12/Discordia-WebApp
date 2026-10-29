import { test, expect } from '@playwright/test';
import { cleanTestServers, createServerViaUI, loginWithTestUser } from './helpers';

test.describe('Mensajería y Chat en Canal', () => {
  test.beforeEach(() => {
    cleanTestServers();
  });

  test.afterAll(() => {
    cleanTestServers();
  });

  test('debe enviar un mensaje en el canal de texto y renderizarlo en el historial', async ({ page }) => {
    // 1. Iniciar sesión y crear un servidor para el test
    await loginWithTestUser(page);

    const serverName = `Servidor Chat ${Date.now().toString().slice(-4)}`;
    await createServerViaUI(page, serverName);

    // 2. Abrir el servidor
    const serverButton = page.getByRole('button', { name: new RegExp(serverName) });
    await serverButton.click();

    // 3. Ubicar el input del chat del canal de texto (general)
    const chatInput = page.getByPlaceholder(/Enviar mensaje a/i);
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    // 4. Escribir y enviar el mensaje
    const messageContent = `Mensaje de prueba E2E ${Date.now().toString().slice(-4)}`;
    await chatInput.fill(messageContent);
    await chatInput.press('Enter');

    // 5. Verificar que el mensaje aparece en la pantalla del chat
    await expect(page.getByText(messageContent)).toBeVisible({ timeout: 15000 });
  });
});

