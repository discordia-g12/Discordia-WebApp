import { test, expect, type Page } from '@playwright/test';

/**
 * Llamada privada 1 a 1 (#50) contra los mocks de @discordia/core, como direct-messages.spec.ts (puerto 5175,
 * VITE_USE_MOCK). El mock no tiene LiveKit: se prueba la interfaz y las reglas (quién atiende, rechaza o no
 * contesta), no el audio. Sofia (u1) atiende a los 3 s, Martín (u2) rechaza y el resto no contesta (30 s).
 * Lo que haría el otro usuario (llamar, cortar) se simula con window.__discordiaMock.
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

async function openDm(page: Page, name: string) {
  await dmList(page).getByRole('button', { name: new RegExp(name) }).click();
}

const callPanel = (page: Page, name: string) => page.getByRole('region', { name: `Llamada con ${name}` });
const incoming = (page: Page, name: string) => page.getByRole('region', { name: `Llamada entrante de ${name}` });
/** Lo que haría el otro usuario, por el mock expuesto en modo desarrollo. */
const simulate = (page: Page, action: 'call-from-u2' | 'remote-hang-up') =>
  page.evaluate((what) => {
    const mock = window.__discordiaMock!;
    if (what === 'call-from-u2') mock.simulateIncomingCall('u2');
    else mock.simulateRemoteHangUp();
  }, action);

test.describe('Llamadas privadas', () => {
  test('iniciar: llamando…, atiende, en llamada y cortar', async ({ page }) => {
    await login(page);
    await openDm(page, 'Sofia Rossi');
    await page.getByRole('button', { name: /^Llamar a / }).click();

    const panel = callPanel(page, 'Sofia Rossi');
    await expect(panel.getByRole('status')).toHaveText('llamando…/');
    await expect(page.getByRole('group', { name: 'Llamada privada en curso' })).toContainText('@Sofia Rossi');

    await expect(panel.getByRole('status')).toHaveText(/^en llamada\/ \d\d:\d\d$/, { timeout: 6000 });
    await expect(page.getByText('En llamada/', { exact: true })).toBeVisible();

    await panel.getByRole('button', { name: 'Cortar llamada' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'llamada finalizada/' })).toBeVisible();
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Llamar a / })).toBeVisible();
  });

  test('cortar desde la barra lateral, en otra vista', async ({ page }) => {
    await login(page);
    await openDm(page, 'Sofia Rossi');
    await page.getByRole('button', { name: /^Llamar a / }).click();
    await expect(callPanel(page, 'Sofia Rossi').getByRole('status')).toHaveText(/^en llamada\//, { timeout: 6000 });

    // Otra conversación: la llamada sigue y se corta desde los controles de la barra lateral
    await openDm(page, 'Martín Méndez');
    await expect(callPanel(page, 'Sofia Rossi')).toHaveCount(0);
    await page.getByRole('group', { name: 'Llamada privada en curso' }).getByRole('button', { name: 'Cortar llamada' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'llamada finalizada/' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Llamada privada en curso' })).toHaveCount(0);
  });

  test('rechazada por el otro: "no puede atender ahora"', async ({ page }) => {
    await login(page);
    await openDm(page, 'Martín Méndez');
    await page.getByRole('button', { name: /^Llamar a / }).click();

    await expect(callPanel(page, 'Martín Méndez').getByRole('status')).toHaveText('llamando…/');
    await expect(page.getByRole('status').filter({ hasText: 'no puede atender ahora/' })).toBeVisible({ timeout: 6000 });
  });

  test('no responde: a los 30 s, "no respondió"', async ({ page }) => {
    await page.clock.install();
    await login(page);
    // Emma no es amiga: hay que aceptar su solicitud para poder llamarla
    await openDm(page, 'Emma Watson');
    await page.getByRole('article', { name: 'Emma Watson quiere hablar con vos' }).getByRole('button', { name: 'Aceptar /' }).click();
    await page.getByRole('button', { name: /^Llamar a / }).click();
    await expect(callPanel(page, 'Emma Watson').getByRole('status')).toHaveText('llamando…/');

    await page.clock.fastForward(31_000);

    await expect(page.getByRole('status').filter({ hasText: 'no respondió/' })).toBeVisible();
    await expect(callPanel(page, 'Emma Watson')).toHaveCount(0);
  });

  test('recibir y atender: el aviso se ve en cualquier vista y abre el chat con la llamada', async ({ page }) => {
    await login(page);
    await openDm(page, 'Sofia Rossi');

    await simulate(page, 'call-from-u2');

    const notice = incoming(page, 'Martín Méndez');
    await expect(notice).toContainText('te está llamando/');
    await expect(page).toHaveTitle('llamada entrante/ Martín Méndez');

    await notice.getByRole('button', { name: 'Atender /' }).click();

    await expect(notice).toHaveCount(0);
    await expect(callPanel(page, 'Martín Méndez').getByRole('status')).toHaveText(/^en llamada\//);
    await expect(page).not.toHaveTitle(/llamada entrante/);

    // El otro corta
    await simulate(page, 'remote-hang-up');
    await expect(page.getByRole('status').filter({ hasText: 'llamada finalizada/' })).toBeVisible();
  });

  test('recibir y rechazar: deja de sonar sin aviso de fin', async ({ page }) => {
    await login(page);
    await simulate(page, 'call-from-u2');

    const notice = incoming(page, 'Martín Méndez');
    await notice.getByRole('button', { name: '_rechazar' }).click();

    await expect(notice).toHaveCount(0);
    await expect(page.getByText(/llamada (finalizada|perdida)\//)).toHaveCount(0);
    await expect(page).not.toHaveTitle(/llamada entrante/);
  });

  test('recibir con el teclado: el foco está en atender', async ({ page }) => {
    await login(page);
    await simulate(page, 'call-from-u2');

    const notice = incoming(page, 'Martín Méndez');
    await expect(notice.getByRole('button', { name: 'Atender /' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(callPanel(page, 'Martín Méndez').getByRole('status')).toHaveText(/^en llamada\//);
  });
});
