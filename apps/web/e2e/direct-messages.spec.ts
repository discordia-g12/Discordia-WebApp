import { test, expect, type Page } from '@playwright/test';

/**
 * Mensajes directos (#42, #43 y #36) contra los mocks de @discordia/core: la app corre con VITE_USE_MOCK en
 * el puerto 5175 (ver playwright.config.ts), sin backend ni Auth0. El mock simula las reglas de producto; lo
 * que depende del backend real (dos usuarios, tiempo real) se prueba en la integración.
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

const dmList = (page: Page) => page.getByRole('complementary', { name: 'Mensajes directos' });
const dmRow = (page: Page, name: string) => dmList(page).getByRole('button', { name: new RegExp(name) });

test.describe('Mensajes directos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('solicitud de amistad: tarjeta con el chiste, aceptar y chatear', async ({ page }) => {
    await expect(dmRow(page, 'Valentina Chen')).toContainText('Solicitud de amistad/');
    await dmRow(page, 'Valentina Chen').click();

    const card = page.getByRole('article', { name: 'Valentina Chen quiere ser tu amigo' });
    await expect(card).toContainText('Te vi en el server de la materia');

    await card.getByRole('button', { name: 'Aceptar /' }).click();

    const input = page.getByRole('combobox', { name: 'Enviar mensaje a @Valentina Chen' });
    await expect(input).toBeVisible();
    // Son amigos y es el primer mensaje: sin conversación todavía, no se ofrece adjuntar
    await expect(page.getByRole('button', { name: 'Adjuntar archivo' })).toHaveCount(0);
    await input.fill('hola valen');
    await input.press('Enter');

    await expect(page.getByRole('log')).toContainText('hola valen');
    await expect(dmRow(page, 'Valentina Chen')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adjuntar archivo' })).toBeVisible();
  });

  test('solicitud de mensaje: aceptar libera el chat y no los hace amigos', async ({ page }) => {
    await dmRow(page, 'Emma Watson').click();

    const card = page.getByRole('article', { name: 'Emma Watson quiere hablar con vos' });
    await expect(card).toContainText('¿Pudiste ver la nueva paleta de colores?');
    await expect(page.getByRole('combobox')).toHaveCount(0);

    await card.getByRole('button', { name: 'Aceptar /' }).click();

    await expect(page.getByRole('combobox', { name: 'Enviar mensaje a @Emma Watson' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Agregar a Emma Watson como amigo' })).toBeVisible();
  });

  test('bloquear y desbloquear conserva el historial', async ({ page }) => {
    await dmRow(page, 'Sofia Rossi').click();
    await expect(page.getByRole('combobox', { name: 'Enviar mensaje a @Sofia Rossi' })).toBeVisible();

    await page.getByRole('button', { name: 'Más opciones' }).click();
    await page.getByRole('menuitem', { name: 'Bloquear a Sofia Rossi' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Bloquear /' }).click();

    await expect(page.getByText('Desbloqueá para escribir.')).toBeVisible();
    await expect(page.getByRole('log').locator('li').first()).toBeVisible();

    await page.getByRole('button', { name: 'Desbloquear a Sofia Rossi' }).click();
    await expect(page.getByRole('combobox', { name: 'Enviar mensaje a @Sofia Rossi' })).toBeVisible();
  });

  test('esperando respuesta: quien inició no puede mandar otro', async ({ page }) => {
    await dmRow(page, 'Lucas Silva').click();

    await expect(page.getByText('Esperando respuesta.')).toBeVisible();
    await expect(page.getByRole('combobox')).toHaveCount(0);
  });

  test('perfil público: datos, servidores en común y enviar mensaje', async ({ page }) => {
    await dmRow(page, 'Sofia Rossi').click();
    await page.getByRole('button', { name: 'Ver el perfil de Sofia Rossi' }).click();

    const profile = page.getByRole('dialog', { name: 'Sofia Rossi' });
    await expect(profile.getByRole('region', { name: 'Servidores en común' }).locator('li').first()).toBeVisible();
    await expect(profile).not.toContainText('próximamente');

    await profile.getByRole('button', { name: '_enviar mensaje' }).click();

    await expect(profile).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Enviar mensaje a @Sofia Rossi' })).toBeVisible();
  });

  test('eliminar amigo pide confirmación y conserva la conversación', async ({ page }) => {
    await page.getByRole('tab', { name: /Todos/ }).click();
    const friends = page.getByRole('region', { name: 'Lista de amigos' });
    const row = friends.getByRole('listitem').filter({ hasText: 'Sofia Rossi' });
    await row.getByRole('button', { name: 'eliminar' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar /' }).click();

    await expect(row).toHaveCount(0);
    await expect(dmRow(page, 'Sofia Rossi')).toBeVisible();
  });

  test('añadir amigo por username y por email, y la solicitud queda en Pendiente', async ({ page }) => {
    await page.getByRole('tab', { name: 'Añadir amigo' }).click();

    await page.getByLabel('nombre de usuario o email').fill('emma_w');
    await page.getByLabel('descripción (opcional)').fill('de la facu');
    await page.getByRole('button', { name: 'Enviar solicitud /' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'emma_w' })).toBeVisible();

    await page.getByLabel('nombre de usuario o email').fill('nadie@example.com');
    await page.getByRole('button', { name: 'Enviar solicitud /' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'nadie@example.com' })).toBeVisible();

    await page.getByRole('tab', { name: /Pendiente/ }).click();
    await expect(page.getByRole('region', { name: 'Lista de amigos' }).getByText('Emma Watson')).toBeVisible();
  });
});

test.describe('Mensajes directos en pantalla chica', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('la lista lleva al chat y se vuelve con la flecha', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('btn-submit-login')).toBeEnabled({ timeout: 10000 });
    await page.getByRole('textbox', { name: 'correo electrónico' }).fill('e2e@discordia.test');
    await page.getByRole('textbox', { name: 'contraseña' }).fill('mock-e2e');
    await page.getByTestId('btn-submit-login').click();

    await page.getByRole('button', { name: 'Mensajes' }).click();
    await page.getByRole('button', { name: /Sofia Rossi.*sin leer/ }).click();
    await expect(page.getByRole('combobox', { name: 'Enviar mensaje a @Sofia Rossi' })).toBeVisible();

    await page.getByRole('button', { name: 'Volver a Mensajes' }).click();
    await expect(page.getByRole('heading', { name: 'Mensajes directos /' })).toBeVisible();
  });
});
