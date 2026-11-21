import { test, expect, type Page } from '@playwright/test';

/**
 * Mensajes fijados contra los mocks de @discordia/core (VITE_USE_MOCK, puerto 5175): fijar desde el menú del
 * mensaje e ir a un fijado que está más atrás de lo cargado, en un canal y en un DM. El historial largo y el
 * fijado viejo se siembran con window.__discordiaMock antes de abrir el chat.
 */
test.use({ baseURL: 'http://localhost:5175' });

async function login(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('btn-submit-login')).toBeEnabled({ timeout: 10000 });
  await page.getByRole('textbox', { name: 'correo electrónico' }).fill('e2e@discordia.test');
  await page.getByRole('textbox', { name: 'contraseña' }).fill('mock-e2e');
  await page.getByTestId('btn-submit-login').click();
  await expect(page.getByRole('heading', { name: 'Mensajes directos /' })).toBeVisible({ timeout: 20000 });
}

/** 120 mensajes viejos (más de dos páginas) y fijado el número `n` (1 es el más viejo de todos). */
async function seedOldPinned(page: Page, channelId: string, n = 1) {
  await page.evaluate(
    async ([id, index]) => {
      const mock = window.__discordiaMock!;
      const seeded = mock.seedOlderMessages(id, 120);
      await mock.setMessagePinned!(id, seeded[index - 1].id, true);
    },
    [channelId, n] as const
  );
}

/** Abre los fijados, toca el viejo número `n` y espera que el mensaje quede a la vista y marcado. */
async function jumpToOldPinned(page: Page, openPins: () => Promise<void>, n = 1) {
  const target = page.locator(`[data-message-id$="-old-${n}"]`);
  // El fijado está dos páginas más atrás de lo cargado: todavía no está en el historial
  await expect(target).toHaveCount(0);
  await openPins();
  const panel = page.getByRole('dialog', { name: 'Mensajes fijados' });
  const pinned = panel.getByRole('listitem').filter({ hasText: new RegExp(`mensaje viejo ${n}(?!\\d)`) });
  await expect(pinned).toHaveCount(1);
  await pinned.getByRole('button', { name: /^Ir al mensaje de/ }).click();

  await expect(panel).toBeHidden();
  await expect(target).toContainText(`mensaje viejo ${n}`);
  await expect(target).toBeInViewport({ timeout: 10000 });
  await expect(target).toHaveClass(/highlighted/);
}

test.describe('Mensajes fijados', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('canal: fijar desde "más" y luego ir a un fijado que no estaba cargado', async ({ page }) => {
    await seedOldPinned(page, 'ch-general');
    await page.getByRole('button', { name: /Indie Developers/ }).first().click();
    const log = page.getByRole('log', { name: /general/ });
    await expect(log).toBeVisible({ timeout: 15000 });

    // Fijar el último mensaje desde el menú "más"
    const last = log.locator('li[data-message-id]').last();
    await last.hover();
    await last.getByRole('button', { name: '_más' }).click();
    await page.getByRole('button', { name: 'fijar mensaje' }).click();
    await expect(page.getByRole('button', { name: 'Mensajes fijados (2)' })).toBeVisible();

    await jumpToOldPinned(page, () => page.getByRole('button', { name: 'Mensajes fijados (2)' }).click());
  });

  test('DM: ir a un fijado que no estaba cargado', async ({ page }) => {
    await seedOldPinned(page, 'dm-u1');
    await page
      .getByRole('complementary', { name: 'Mensajes directos' })
      .getByRole('button', { name: /Sofia Rossi/ })
      .click();
    await expect(page.getByRole('log')).toBeVisible({ timeout: 15000 });

    await jumpToOldPinned(page, () => page.getByRole('button', { name: /fijados/i }).first().click());
  });

  test('DM: un fijado del medio del historial queda a la vista', async ({ page }) => {
    await seedOldPinned(page, 'dm-u1', 60);
    await page
      .getByRole('complementary', { name: 'Mensajes directos' })
      .getByRole('button', { name: /Sofia Rossi/ })
      .click();
    await expect(page.getByRole('log')).toBeVisible({ timeout: 15000 });

    await jumpToOldPinned(page, () => page.getByRole('button', { name: /fijados/i }).first().click(), 60);
  });
});
