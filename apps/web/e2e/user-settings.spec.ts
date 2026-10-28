import { test, expect } from '@playwright/test';
import { cleanTestServers, loginWithTestUser } from './helpers';

test.describe('Ajustes de Usuario y Cierre de Sesión', () => {
  test.beforeEach(() => {
    cleanTestServers();
  });

  test.afterAll(() => {
    cleanTestServers();
  });

  test('debe abrir los ajustes de usuario, navegar secciones y cerrar sesión de forma segura', async ({ page }) => {
    // 1. Iniciar sesión con el usuario de pruebas
    await loginWithTestUser(page);

    // 2. Abrir Ajustes de Usuario desde la barra inferior
    const settingsButton = page.getByRole('button', { name: 'Ajustes de usuario' });
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // 3. Validar apertura del diálogo de ajustes
    const settingsDialog = page.getByRole('dialog', { name: 'Ajustes de usuario' });
    await expect(settingsDialog).toBeVisible({ timeout: 10000 });

    // 4. Navegar entre secciones del menú
    await page.getByRole('button', { name: 'Experiencia' }).click();
    await expect(page.getByRole('region', { name: 'Tema' })).toBeVisible();

    await page.getByRole('button', { name: 'Cuenta' }).click();
    await expect(page.getByRole('region', { name: 'Información de la cuenta' })).toBeVisible();

    // 5. Cerrar el modal de ajustes y volver al dashboard
    await page.getByRole('button', { name: 'Cerrar ajustes de usuario' }).click();
    await expect(settingsDialog).not.toBeVisible();

    // 6. Volver a abrir para probar el flujo de logout seguro
    await settingsButton.click();
    await expect(settingsDialog).toBeVisible();

    // 7. Tocar cerrar sesión dentro de ajustes
    await settingsDialog.getByRole('button', { name: /Cerrar sesión/i }).click();

    // 8. Validar que aparece el modal de confirmación de Discordia (no confirm nativo del navegador)
    const confirmModal = page.getByRole('alertdialog', { name: '¿Cerrar sesión?' });
    await expect(confirmModal).toBeVisible();

    // 9. Confirmar salida
    await confirmModal.getByRole('button', { name: 'Cerrar sesión /' }).click();

    // 10. Validar redirección limpia a la pantalla de Login
    await expect(page.getByTestId('btn-submit-login')).toBeVisible({ timeout: 15000 });
  });
});
