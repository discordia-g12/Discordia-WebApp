import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthView, PASSWORD_RESET_SENT_MESSAGE } from '../AuthView';
import { useSession, authService } from '../../../platform/auth/session';
import { AccountSuspendedError, SignupConflictError } from '@discordia/core';

// Criterios de aceptación del acceso (lo propio del diseño está en AuthScreen.test.tsx)
describe('AuthView - Criterios de Aceptación', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSession.setState({
      status: 'unauthenticated',
      profile: null,
      error: null,
      isMock: false,
      pendingEmail: null,
    });
  });

  describe('Registro de Usuarios', () => {
    it('CA 3: Formato de email inválido - Indica el error y no permite continuar', async () => {
      render(<AuthView />);

      // Cambiar a la pestaña "Registrarse"
      fireEvent.click(screen.getByTestId('tab-register'));

      // Completar nombre de usuario válido
      const userInput = screen.getByPlaceholderText(/ej: alexr/i);
      fireEvent.change(userInput, { target: { value: 'nuevo_usuario' } });

      // Ingresar email con formato inválido
      const emailInput = screen.getByPlaceholderText(/ejemplo@discordia.com/i);
      fireEvent.change(emailInput, { target: { value: 'correo-invalido-sin-arroba' } });

      // Ingresar contraseña válida
      const passInputs = screen.getAllByPlaceholderText(/mínimo 8 caracteres/i);
      fireEvent.change(passInputs[0], { target: { value: 'Password123!' } });
      const confirmInput = screen.getByPlaceholderText(/repite tu contraseña/i);
      fireEvent.change(confirmInput, { target: { value: 'Password123!' } });

      // Enviar formulario
      const form = screen.getByTestId('btn-submit-register').closest('form')!;
      fireEvent.submit(form);

      const errorMsg = await screen.findByText(/el formato del correo electrónico no es válido/i);
      expect(errorMsg).toBeTruthy();
    });

    it('CA 4: Contraseña insegura - Indica los requisitos mínimos y no permite continuar', async () => {
      render(<AuthView />);

      fireEvent.click(screen.getByTestId('tab-register'));

      const userInput = screen.getByPlaceholderText(/ej: alexr/i);
      fireEvent.change(userInput, { target: { value: 'nuevo_usuario' } });

      const emailInput = screen.getByPlaceholderText(/ejemplo@discordia.com/i);
      fireEvent.change(emailInput, { target: { value: 'usuario@valido.com' } });

      // Contraseña corta (<8 caracteres)
      const passInputs = screen.getAllByPlaceholderText(/mínimo 8 caracteres/i);
      fireEvent.change(passInputs[0], { target: { value: 'abc' } });
      const confirmInput = screen.getByPlaceholderText(/repite tu contraseña/i);
      fireEvent.change(confirmInput, { target: { value: 'abc' } });

      fireEvent.click(screen.getByTestId('btn-submit-register'));

      const errorMsg = await screen.findByText(/la contraseña debe tener al menos 8 caracteres/i);
      expect(errorMsg).toBeTruthy();
    });

    it('CA 2: Email ya registrado - Indica que el correo ya está en uso', async () => {
      vi.spyOn(authService, 'signupWithCredentials').mockRejectedValue(
        new Error('El correo electrónico ya está en uso.')
      );

      render(<AuthView />);

      fireEvent.click(screen.getByTestId('tab-register'));

      const userInput = screen.getByPlaceholderText(/ej: alexr/i);
      fireEvent.change(userInput, { target: { value: 'nuevo_usuario' } });

      const emailInput = screen.getByPlaceholderText(/ejemplo@discordia.com/i);
      fireEvent.change(emailInput, { target: { value: 'repetido@discordia.com' } });

      const passInputs = screen.getAllByPlaceholderText(/mínimo 8 caracteres/i);
      fireEvent.change(passInputs[0], { target: { value: 'Password123!' } });
      const confirmInput = screen.getByPlaceholderText(/repite tu contraseña/i);
      fireEvent.change(confirmInput, { target: { value: 'Password123!' } });

      fireEvent.click(screen.getByTestId('btn-submit-register'));

      const errorMsg = await screen.findByText(/el correo o nombre de usuario ya está en uso/i);
      expect(errorMsg).toBeTruthy();
    });

    it.each([
      ['email', /ya existe una cuenta con ese correo\. iniciá sesión/i],
      ['username', /ese nombre de usuario ya está tomado/i],
    ] as const)('CA 2: Auth0 indica que el %s ya existe - Muestra el mensaje de ese campo', async (field, message) => {
      vi.spyOn(authService, 'signupWithCredentials').mockRejectedValue(new SignupConflictError(field));

      render(<AuthView />);

      fireEvent.click(screen.getByTestId('tab-register'));
      fireEvent.change(screen.getByPlaceholderText(/ej: alexr/i), { target: { value: 'nuevo_usuario' } });
      fireEvent.change(screen.getByPlaceholderText(/ejemplo@discordia.com/i), { target: { value: 'repetido@discordia.com' } });
      fireEvent.change(screen.getAllByPlaceholderText(/mínimo 8 caracteres/i)[0], { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByPlaceholderText(/repite tu contraseña/i), { target: { value: 'Password123!' } });

      fireEvent.click(screen.getByTestId('btn-submit-register'));

      expect(await screen.findByText(message)).toBeTruthy();
    });

    it('CA 1: Registro exitoso con datos válidos - Invoca signupWithCredentials', async () => {
      const signupSpy = vi.spyOn(authService, 'signupWithCredentials').mockResolvedValue();

      render(<AuthView />);

      fireEvent.click(screen.getByTestId('tab-register'));

      const userInput = screen.getByPlaceholderText(/ej: alexr/i);
      fireEvent.change(userInput, { target: { value: 'alex_test' } });

      const emailInput = screen.getByPlaceholderText(/ejemplo@discordia.com/i);
      fireEvent.change(emailInput, { target: { value: 'alex@discordia.com' } });

      const passInputs = screen.getAllByPlaceholderText(/mínimo 8 caracteres/i);
      fireEvent.change(passInputs[0], { target: { value: 'Password123!' } });
      const confirmInput = screen.getByPlaceholderText(/repite tu contraseña/i);
      fireEvent.change(confirmInput, { target: { value: 'Password123!' } });

      fireEvent.click(screen.getByTestId('btn-submit-register'));

      await waitFor(() => {
        expect(signupSpy).toHaveBeenCalledWith({
          email: 'alex@discordia.com',
          password: 'Password123!',
          username: 'alex_test',
          displayName: 'alex_test',
        });
      });
    });
  });

  describe('Inicio de Sesión', () => {
    it('CA 2 & CA 3 Login: Contraseña incorrecta o email no registrado - Muestra error genérico', async () => {
      vi.spyOn(authService, 'loginWithCredentials').mockRejectedValue(
        new Error('El correo electrónico o la contraseña son incorrectos.')
      );

      render(<AuthView />);

      const emailInput = screen.getByPlaceholderText(/ejemplo@discordia.com/i);
      fireEvent.change(emailInput, { target: { value: 'erroneo@discordia.com' } });

      const passInput = screen.getByPlaceholderText(/tu contraseña/i);
      fireEvent.change(passInput, { target: { value: 'WrongPassword123' } });

      fireEvent.click(screen.getByTestId('btn-submit-login'));

      const errorMsg = await screen.findByText(/el correo electrónico o la contraseña son incorrectos/i);
      expect(errorMsg).toBeTruthy();
    });

    it('CA 1 Login: Login exitoso con credenciales correctas - Invoca loginWithCredentials', async () => {
      const loginSpy = vi.spyOn(authService, 'loginWithCredentials').mockResolvedValue();

      render(<AuthView />);

      const emailInput = screen.getByPlaceholderText(/ejemplo@discordia.com/i);
      fireEvent.change(emailInput, { target: { value: 'correcto@discordia.com' } });

      const passInput = screen.getByPlaceholderText(/tu contraseña/i);
      fireEvent.change(passInput, { target: { value: 'Password123!' } });

      fireEvent.click(screen.getByTestId('btn-submit-login'));

      await waitFor(() => {
        expect(loginSpy).toHaveBeenCalledWith({
          email: 'correcto@discordia.com',
          password: 'Password123!',
        });
      });
    });
  });

  describe('Verificación de email', () => {
    it('muestra la pantalla de verificación con el email pendiente', () => {
      useSession.setState({ status: 'email_unverified', pendingEmail: 'pepe@discordia.com' });

      render(<AuthView />);

      expect(screen.getByTestId('email-unverified-screen')).toBeTruthy();
      expect(screen.getByText(/verificá tu email/i)).toBeTruthy();
      expect(screen.getByText('pepe@discordia.com')).toBeTruthy();
      // No debe mostrarse como cuenta suspendida
      expect(screen.queryByText(/cuenta suspendida/i)).toBeNull();
    });

    it('"Ya lo verifiqué" vuelve al login con el email precargado y la contraseña vacía', async () => {
      useSession.setState({ status: 'email_unverified', pendingEmail: 'pepe@discordia.com' });

      render(<AuthView />);
      fireEvent.click(screen.getByTestId('btn-verified-retry'));

      const emailInput = (await screen.findByPlaceholderText(/ejemplo@discordia.com/i)) as HTMLInputElement;
      const passInput = screen.getByPlaceholderText(/tu contraseña/i) as HTMLInputElement;
      expect(useSession.getState().status).toBe('unauthenticated');
      expect(emailInput.value).toBe('pepe@discordia.com');
      expect(passInput.value).toBe('');
    });

    it('"Usar otra cuenta" cierra la sesión', async () => {
      useSession.setState({ status: 'email_unverified', pendingEmail: 'pepe@discordia.com' });
      const logoutSpy = vi.spyOn(authService, 'logout').mockResolvedValue();

      render(<AuthView />);
      fireEvent.click(screen.getByTestId('btn-use-other-account'));

      await waitFor(() => expect(logoutSpy).toHaveBeenCalledTimes(1));
    });

    it('login de una cuenta suspendida muestra el mensaje de suspensión (por tipo de error, no por texto)', async () => {
      vi.spyOn(authService, 'loginWithCredentials').mockRejectedValue(new AccountSuspendedError());

      render(<AuthView />);
      fireEvent.change(screen.getByPlaceholderText(/ejemplo@discordia.com/i), {
        target: { value: 'suspendido@discordia.com' },
      });
      fireEvent.change(screen.getByPlaceholderText(/tu contraseña/i), { target: { value: 'Password123!' } });
      fireEvent.click(screen.getByTestId('btn-submit-login'));

      expect(await screen.findByText(/tu cuenta se encuentra suspendida/i)).toBeTruthy();
    });
  });
  describe('Recupero de contraseña', () => {
    const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json', ...headers },
      });

    const openForgotAndSubmit = async (email: string) => {
      fireEvent.click(screen.getByTestId('link-forgot-password'));
      fireEvent.change(screen.getByTestId('input-forgot-email'), { target: { value: email } });
      fireEvent.click(screen.getByTestId('btn-submit-forgot'));
    };

    it('el link "¿Olvidaste tu contraseña?" abre el formulario con el email del login precargado', () => {
      render(<AuthView />);
      fireEvent.change(screen.getByPlaceholderText(/ejemplo@discordia.com/i), { target: { value: 'ana@discordia.com' } });

      fireEvent.click(screen.getByTestId('link-forgot-password'));

      expect(screen.getByText('Recuperar contraseña')).toBeTruthy();
      expect((screen.getByTestId('input-forgot-email') as HTMLInputElement).value).toBe('ana@discordia.com');
      expect(screen.queryByTestId('tab-login')).toBeNull();
    });

    it('CA 1: envía el pedido al endpoint público, sin Authorization, y muestra el mensaje genérico', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(202, { detail: 'accepted' }));
      render(<AuthView />);

      await openForgotAndSubmit('ana@discordia.com');

      expect(await screen.findByTestId('forgot-sent')).toBeTruthy();
      expect(screen.getByText(PASSWORD_RESET_SENT_MESSAGE)).toBeTruthy();
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/api\/v1\/auth\/password-reset$/);
      expect(init.method).toBe('POST');
      expect(JSON.parse(String(init.body))).toEqual({ email: 'ana@discordia.com' });
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    });

    it('CA 4: el mensaje de éxito es el mismo para cualquier email (no depende de la respuesta)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(202, { detail: 'cualquier texto del backend' }));
      render(<AuthView />);

      await openForgotAndSubmit('noexiste@discordia.com');

      expect(await screen.findByText(PASSWORD_RESET_SENT_MESSAGE)).toBeTruthy();
      expect(screen.queryByText('cualquier texto del backend')).toBeNull();
    });

    it('valida el formato del email en el cliente y no llama al backend', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      render(<AuthView />);

      await openForgotAndSubmit('correo-invalido');

      expect(await screen.findByText(/el formato del correo electrónico no es válido/i)).toBeTruthy();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('CA 5: ante un 429 informa el límite con el tiempo de espera de Retry-After', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(
          429,
          { type: 'https://discordia.app/problems/password-reset-throttled', title: 'Too Many Requests', status: 429 },
          { 'retry-after': '600' },
        ),
      );
      render(<AuthView />);

      await openForgotAndSubmit('ana@discordia.com');

      expect(await screen.findByText(/demasiados pedidos de recupero. Probá de nuevo en 10 minutos/i)).toBeTruthy();
      expect(screen.queryByTestId('forgot-sent')).toBeNull();
    });

    it('un 429 sin Retry-After (límite por IP de Kong) muestra un aviso genérico', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        }),
      );
      render(<AuthView />);

      await openForgotAndSubmit('ana@discordia.com');

      expect(await screen.findByText(/Probá de nuevo en unos minutos/i)).toBeTruthy();
    });

    it('un error del servidor muestra un mensaje genérico sin detalles', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(503, { title: 'Service Unavailable', status: 503, detail: 'detalle interno' }),
      );
      render(<AuthView />);

      await openForgotAndSubmit('ana@discordia.com');

      expect(await screen.findByText(/No pudimos procesar el pedido/i)).toBeTruthy();
      expect(screen.queryByText(/detalle interno/i)).toBeNull();
    });
  });

  describe('Login con Proveedor Federado (Google) - Criterios de Aceptación', () => {
    it('CA 1 & CA 2: el botón "Continuar con Google" está presente en Login e inicia el flujo de autenticación federada', async () => {
      const googleSpy = vi.spyOn(authService, 'loginWithGoogle').mockResolvedValue();

      render(<AuthView />);

      const googleBtn = screen.getByTestId('btn-login-google');
      expect(googleBtn).toBeTruthy();
      expect(googleBtn.textContent).toMatch(/continuar con google/i);

      fireEvent.click(googleBtn);

      await waitFor(() => {
        expect(googleSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('CA 1: el botón "Continuar con Google" está disponible también en la pestaña de Registro', async () => {
      const googleSpy = vi.spyOn(authService, 'loginWithGoogle').mockResolvedValue();

      render(<AuthView />);

      fireEvent.click(screen.getByTestId('tab-register'));

      const googleBtn = screen.getByTestId('btn-register-google');
      expect(googleBtn).toBeTruthy();
      expect(googleBtn.textContent).toMatch(/continuar con google/i);

      fireEvent.click(googleBtn);

      await waitFor(() => {
        expect(googleSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('CA 3: proveedor externo no disponible al iniciar login - informa el error y ofrece email y contraseña como alternativa', async () => {
      vi.spyOn(authService, 'loginWithGoogle').mockRejectedValue(new Error('Connection timeout to Google IdP'));

      render(<AuthView />);

      const googleBtn = screen.getByTestId('btn-login-google');
      fireEvent.click(googleBtn);

      // Informa el error al usuario
      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert.textContent).toMatch(/el proveedor externo no está disponible o no respondió/i);
      expect(errorAlert.textContent).toMatch(/podés iniciar sesión con correo y contraseña/i);

      // Ofrece el login con email y contraseña como alternativa activa
      const emailInput = screen.getByPlaceholderText(/ejemplo@discordia.com/i) as HTMLInputElement;
      const passInput = screen.getByPlaceholderText(/tu contraseña/i) as HTMLInputElement;
      const submitBtn = screen.getByTestId('btn-submit-login');

      expect(emailInput).toBeTruthy();
      expect(passInput).toBeTruthy();
      expect(submitBtn).toBeTruthy();
      expect(emailInput.disabled).toBe(false);
      expect(passInput.disabled).toBe(false);
      expect(submitBtn.hasAttribute('disabled')).toBe(false);
    });

    it('CA 3: proveedor externo no disponible tras retorno de redirección - el sistema informa el error y mantiene el formulario de email y contraseña', async () => {
      // Simula que la redirección regresó con error de proveedor no disponible
      useSession.setState({
        status: 'unauthenticated',
        error: {
          title: 'Proveedor no disponible',
          message: 'El proveedor externo no está disponible o no respondió. Podés iniciar sesión con correo y contraseña.',
        },
      });

      render(<AuthView />);

      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert.textContent).toMatch(/el proveedor externo no está disponible o no respondió/i);
      expect(errorAlert.textContent).toMatch(/podés iniciar sesión con correo y contraseña/i);

      // El usuario puede usar email y contraseña como alternativa
      const emailInput = screen.getByPlaceholderText(/ejemplo@discordia.com/i);
      const passInput = screen.getByPlaceholderText(/tu contraseña/i);
      expect(emailInput).toBeTruthy();
      expect(passInput).toBeTruthy();
    });
  });
});