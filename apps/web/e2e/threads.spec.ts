import { test, expect, type Page } from '@playwright/test';
import {
  cleanTestServers,
  createServerViaUI,
  isMockBackend,
  loginWithTestUser,
  mockTextChannelId,
  mockThreadReplyFromOther,
} from './helpers';

/**
 * Responder en un hilo (CA1 a CA5). Abrir el hilo, responder y ver el resumen corre contra Kong o contra el
 * mock. El aviso necesita que responda otro usuario: solo contra el mock (/__test/thread-replies).
 */

async function openNewServer(page: Page, prefix: string) {
  await loginWithTestUser(page);
  const serverName = `${prefix} ${Date.now().toString().slice(-5)}`;
  await createServerViaUI(page, serverName);
  await page.getByRole('button', { name: new RegExp(serverName) }).click();
  const input = page.getByRole('combobox', { name: /Enviar mensaje a/i });
  await expect(input).toBeVisible({ timeout: 15000 });
  return { serverName, input };
}

const channelLog = (page: Page) => page.getByRole('log', { name: /Mensajes de/ }).first();
const threadPanel = (page: Page) => page.getByRole('complementary', { name: 'Hilo' });

test.describe('Hilos', () => {
  test.beforeEach(() => {
    cleanTestServers();
  });

  test.afterAll(() => {
    cleanTestServers();
  });

  test('responder en un hilo: el original arriba, la respuesta solo en el hilo y el contador en el canal', async ({ page }) => {
    const { input } = await openNewServer(page, 'Hilos');
    await input.pressSequentially('¿quién viene el viernes?');
    await input.press('Enter');
    const original = channelLog(page).locator('li[data-message-id]').filter({ hasText: '¿quién viene el viernes?' });
    await expect(original).toBeVisible({ timeout: 15000 });

    // CA1: "responder en hilo" abre el panel con el original como contexto (CA4)
    await original.hover();
    await original.getByRole('button', { name: '_responder en hilo' }).click();
    const panel = threadPanel(page);
    await expect(panel.getByRole('heading', { name: 'Hilo' })).toBeVisible();
    await expect(panel.getByRole('list', { name: 'Mensaje original' })).toContainText('¿quién viene el viernes?');

    // CA2: la respuesta se publica en el hilo
    const reply = panel.getByRole('combobox', { name: 'Responder en el hilo' });
    await expect(reply).toBeFocused();
    await reply.pressSequentially('yo voy');
    await reply.press('Enter');
    await expect(panel.getByRole('log')).toContainText('yo voy', { timeout: 15000 });

    // ...y no en el canal
    await expect(channelLog(page)).not.toContainText('yo voy');

    // CA3: al recargar, el original muestra cuántas respuestas tiene y abre el hilo
    await page.reload();
    await expect(page.getByRole('button', { name: /Abrir hilo: 1 respuesta/ })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: /Abrir hilo: 1 respuesta/ }).click();
    await expect(threadPanel(page).getByRole('log')).toContainText('yo voy', { timeout: 15000 });

    // Escape cierra el panel
    await threadPanel(page).getByRole('combobox', { name: 'Responder en el hilo' }).press('Escape');
    await expect(threadPanel(page)).toBeHidden();
  });

  test('CA5: cuando otro responde en un hilo donde participo, me llega el aviso y lleva al hilo', async ({ page }) => {
    test.skip(!(await isMockBackend()), 'Necesita /__test del mock para que responda otro usuario');

    const { serverName, input } = await openNewServer(page, 'Hilos aviso');
    await input.pressSequentially('propuesta de logo');
    await input.press('Enter');
    const original = channelLog(page).locator('li[data-message-id]').filter({ hasText: 'propuesta de logo' });
    await expect(original).toBeVisible({ timeout: 15000 });
    const parentId = (await original.getAttribute('data-message-id')) as string;

    const { channelId } = await mockTextChannelId(serverName);
    await mockThreadReplyFromOther(channelId, parentId, 'me gusta el segundo');

    // La campana del rail: la lista se pide al abrirla
    await page.getByRole('button', { name: /^Avisos/ }).click();
    const notice = page.getByRole('button', { name: /Sin leer: Ana E2E respondió en un hilo/ });
    await expect(notice).toBeVisible({ timeout: 15000 });
    await expect(notice).toContainText('me gusta el segundo');
    await notice.click();

    // Abre el hilo y el aviso queda leído
    await expect(threadPanel(page).getByRole('log')).toContainText('me gusta el segundo', { timeout: 15000 });
    await page.getByRole('button', { name: /^Avisos/ }).click();
    await expect(page.getByRole('button', { name: 'Ana E2E respondió en un hilo' })).toBeVisible();
  });
});
