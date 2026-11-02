import { test, expect, type Page } from '@playwright/test';
import {
  TEST_USER_ID,
  cleanTestServers,
  createServerViaUI,
  isMockBackend,
  loginWithTestUser,
  mockMessageFromOther,
  mockRole,
  mockTextChannelId,
} from './helpers';

/**
 * Menciones (#46). Lo de quien escribe (autocompletar y enviar) corre contra Kong o contra el mock. Lo que
 * necesita a otro usuario (recibir una mención, @everyone sin permiso, roles) solo contra el mock: el
 * harness tiene un único usuario de prueba.
 */

const none = { users: [], roles: [], everyone: false };

/** Crea un servidor, lo abre y devuelve el input del chat de #general. */
async function openNewServer(page: Page, prefix: string) {
  await loginWithTestUser(page);
  const serverName = `${prefix} ${Date.now().toString().slice(-5)}`;
  await createServerViaUI(page, serverName);
  await page.getByRole('button', { name: new RegExp(serverName) }).click();
  const input = page.getByRole('combobox', { name: /Enviar mensaje a/i });
  await expect(input).toBeVisible({ timeout: 15000 });
  return { serverName, input };
}

const messages = (page: Page) => page.getByRole('log', { name: /Mensajes de/ });
const messageWith = (page: Page, text: string) => messages(page).locator('li').filter({ hasText: text });

test.describe('Menciones', () => {
  test.beforeEach(() => {
    cleanTestServers();
  });

  test.afterAll(() => {
    cleanTestServers();
  });

  test('el dueño elige @everyone en el autocompletado y se ve resaltado', async ({ page }) => {
    const { input } = await openNewServer(page, 'Menciones everyone');

    await input.pressSequentially('@ev');
    await expect(page.getByRole('option', { name: /@everyone/ })).toBeVisible();
    await input.press('Enter');
    await expect(input).toHaveValue('@everyone ');
    await input.pressSequentially('reunión a las 18');
    await input.press('Enter');

    const sent = messageWith(page, 'reunión a las 18');
    await expect(sent).toBeVisible({ timeout: 15000 });
    await expect(sent.locator('[class*="mention"]', { hasText: '@everyone' })).toBeVisible();
  });

  test('menciona a un miembro: se ve @nombre y nunca el token', async ({ page }) => {
    const { input } = await openNewServer(page, 'Menciones usuario');

    await input.pressSequentially('@');
    const first = page.getByRole('option').first();
    await expect(first).toBeVisible();
    await input.press('Enter');
    await expect(input).toHaveValue(/^@\S.* $/);
    await input.pressSequentially('mirá esto');
    await input.press('Enter');

    const sent = messageWith(page, 'mirá esto');
    await expect(sent).toBeVisible({ timeout: 15000 });
    await expect(sent.getByRole('button', { name: /^@/ })).toBeVisible();
    await expect(messages(page)).not.toContainText('<@');
  });

  test.describe('con otro miembro (solo mock)', () => {
    test.beforeEach(async () => {
      test.skip(!(await isMockBackend()), 'Necesita un segundo usuario: corre contra mock-backend.mjs');
    });

    test('recibe una mención: @1 en el servidor, el mensaje resaltado y al abrirlo se limpia', async ({ page }) => {
      const { serverName } = await openNewServer(page, 'Menciones recibe');
      const { channelId } = await mockTextChannelId(serverName);
      await page.getByRole('button', { name: 'Mensajes directos' }).click();

      await mockMessageFromOther(channelId, `che <@${TEST_USER_ID}>, te necesito`, { ...none, users: [TEST_USER_ID] });
      await page.reload();

      const server = page.getByRole('button', { name: `Servidor ${serverName}, 1 mención` });
      await expect(server).toBeVisible({ timeout: 20000 });
      await expect(server.getByTestId('server-unread')).toHaveText('@1');

      // Al abrir el canal se marca leído (con 1 s de debounce): se espera ese pedido antes de salir
      const markedRead = page.waitForResponse((r) => r.request().method() === 'POST' && /\/channels\/[^/]+\/read$/.test(r.url()));
      await server.click();
      const received = messageWith(page, 'te necesito');
      await expect(received).toBeVisible({ timeout: 15000 });
      await expect(received).toHaveClass(/mentioned/);
      await expect(received.getByRole('button', { name: '@discordia_test' })).toBeVisible();
      await markedRead;

      await page.getByRole('button', { name: 'Mensajes directos' }).click();
      await expect(page.getByRole('button', { name: `Servidor ${serverName}`, exact: true })).toBeVisible({ timeout: 15000 });
    });

    test('un @everyone sin permiso se ve como texto plano y no avisa (CA 4)', async ({ page }) => {
      const { serverName } = await openNewServer(page, 'Menciones texto');
      const { channelId } = await mockTextChannelId(serverName);
      await page.getByRole('button', { name: 'Mensajes directos' }).click();

      await mockMessageFromOther(channelId, '@everyone vengan', none);
      await page.reload();

      // No leído, pero sin mención
      const server = page.getByRole('button', { name: `Servidor ${serverName}, 1 mensaje nuevo` });
      await expect(server).toBeVisible({ timeout: 20000 });
      await expect(server.getByTestId('server-unread')).toHaveText('1');

      await server.click();
      const received = messageWith(page, 'vengan');
      await expect(received).toBeVisible({ timeout: 15000 });
      await expect(received).toContainText('@everyone vengan');
      await expect(received).not.toHaveClass(/mentioned/);
      await expect(received.locator('[class*="mention"]')).toHaveCount(0);
    });

    test('el dueño menciona a un rol desde el autocompletado', async ({ page }) => {
      const { serverName, input } = await openNewServer(page, 'Menciones rol');
      const { serverId } = await mockTextChannelId(serverName);
      await mockRole(serverId, 'soporte');
      // Los roles se piden al abrir el servidor: se recarga (vuelve al inicio) y se lo abre de nuevo
      await page.reload();
      await page.getByRole('button', { name: new RegExp(serverName) }).click();
      await expect(input).toBeVisible({ timeout: 15000 });

      await input.pressSequentially('@sop');
      await expect(page.getByRole('option', { name: /@soporte/ })).toContainText('rol');
      await input.press('Enter');
      await input.pressSequentially('hay un ticket');
      await input.press('Enter');

      const sent = messageWith(page, 'hay un ticket');
      await expect(sent).toBeVisible({ timeout: 15000 });
      await expect(sent.locator('[class*="mention"]', { hasText: '@soporte' })).toBeVisible();
      await expect(messages(page)).not.toContainText('<@&');
    });
  });
});
