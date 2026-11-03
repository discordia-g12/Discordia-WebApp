import { test, expect } from '@playwright/test';
import { TEST_USER_EMAIL, testUserPassword } from './helpers';

test.describe('Flujo de Autenticación y Acceso al Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Interceptar llamadas al backend para que el test E2E sea 100% autónomo y rápido
    await page.route('**/api/v1/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 's1',
            name: 'Servidor de Prueba',
            owner_id: 'u0',
            channels: [],
            categories: [],
          },
        ]),
      });
    });
  });

  test('debe mostrar la pantalla de inicio de sesión y permitir alternar con registro', async ({ page }) => {
    await page.goto('/');

    const emailInput = page.getByPlaceholder('ejemplo@discordia.com');
    const passwordInput = page.getByPlaceholder('tu contraseña');
    const loginButton = page.getByTestId('btn-submit-login');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    // Alternar a la pestaña de registro
    const registerTab = page.getByTestId('tab-register');
    await registerTab.click();

    // En la vista de registro se muestra el campo de nombre de usuario
    const usernameInput = page.getByPlaceholder('ej: alexr');
    await expect(usernameInput).toBeVisible();

    // Regresar a inicio de sesión
    const loginTab = page.getByTestId('tab-login');
    await loginTab.click();
    await expect(loginButton).toBeVisible();
  });

  test('debe mostrar alerta de error cuando las credenciales son inválidas o incompletas', async ({ page }) => {
    await page.goto('/');

    const loginButton = page.getByTestId('btn-submit-login');
    await expect(loginButton).toBeEnabled({ timeout: 10000 });

    // Intentar iniciar sesión sin completar campos
    await loginButton.click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/correo electrónico o la contraseña/i);
  });

  test('debe iniciar sesión exitosamente y acceder a la interfaz principal', async ({ page }) => {
    await page.goto('/');

    const loginButton = page.getByTestId('btn-submit-login');
    await expect(loginButton).toBeEnabled({ timeout: 10000 });

    // Completar credenciales válidas
    await page.getByPlaceholder('ejemplo@discordia.com').fill(TEST_USER_EMAIL);
    await page.getByPlaceholder('tu contraseña').fill(testUserPassword());

    await loginButton.click();

    // Verificar que el dashboard principal se renderiza (rail de servidores y navegación)
    const serverRail = page.getByRole('navigation', { name: 'Servidores y mensajes directos' });
    await expect(serverRail).toBeVisible({ timeout: 20000 });

    // Verificar que la barra lateral y el contenido principal están visibles
    await expect(page.getByRole('complementary', { name: 'Mensajes directos' })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('CA 1 & CA 2: debe mostrar el botón "Continuar con Google" en Login y Registro', async ({ page }) => {
    await page.goto('/');

    const googleLoginBtn = page.getByTestId('btn-login-google');
    await expect(googleLoginBtn).toBeVisible();
    await expect(googleLoginBtn).toContainText(/continuar con google/i);

    // Cambiar a registro
    await page.getByTestId('tab-register').click();
    const googleRegisterBtn = page.getByTestId('btn-register-google');
    await expect(googleRegisterBtn).toBeVisible();
    await expect(googleRegisterBtn).toContainText(/continuar con google/i);
  });

  test('CA 3: si el proveedor externo no está disponible tras redirección, informa el error y ofrece email y contraseña', async ({ page }) => {
    // Simular que el proveedor externo falló y Auth0 redirigió a /callback con error
    await page.goto('/callback?error=server_error&error_description=External+identity+provider+failed+to+respond');

    // Debe mostrar la alerta con el mensaje explicativo
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText(/el proveedor externo no está disponible o no respondió/i);
    await expect(alert).toContainText(/podés iniciar sesión con correo y contraseña/i);

    // Los campos de email y contraseña deben estar disponibles como alternativa
    const emailInput = page.getByPlaceholder('ejemplo@discordia.com');
    const passwordInput = page.getByPlaceholder('tu contraseña');
    const loginButton = page.getByTestId('btn-submit-login');

    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toBeEnabled();
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();
  });
});
