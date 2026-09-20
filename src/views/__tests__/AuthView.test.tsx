import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthView } from '../AuthView';
import { useSession, authService } from '../../auth/session';

describe('AuthView Component - Criterios de Aceptación', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSession.setState({
      status: 'unauthenticated',
      profile: null,
      error: null,
      isMock: false,
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
});
