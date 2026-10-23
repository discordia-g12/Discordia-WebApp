import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthView } from '../AuthView';
import { DawnIntro } from '../DawnIntro';
import { useSession } from '../../../platform/auth/session';

// Lo propio de la vista del rediseño; los criterios de aceptación compartidos están en AuthView.test.tsx
describe('AuthScreen (rediseño)', () => {
  beforeEach(() => {
    document.documentElement.dataset.ui = 'nuevo';
    useSession.setState({ status: 'unauthenticated', profile: null, error: null, isMock: false, pendingEmail: null });
  });

  afterEach(() => {
    delete document.documentElement.dataset.ui;
  });

  it('las palabras gigantes navegan entre login y registro y marcan la activa', () => {
    render(<AuthView />);

    const login = screen.getByRole('button', { name: 'Iniciar sesión' });
    const register = screen.getByRole('button', { name: 'Registrarse' });
    expect(login.getAttribute('aria-current')).toBe('page');
    expect(register.getAttribute('aria-current')).toBeNull();

    fireEvent.click(register);

    expect(screen.getByRole('button', { name: 'Iniciar sesión' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'Registrarse' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByLabelText(/confirmar contraseña/)).toBeTruthy();
  });

  it('un error de validación aparece bajo su campo, lo marca inválido y le lleva el foco', async () => {
    render(<AuthView />);
    fireEvent.click(screen.getByTestId('tab-register'));

    fireEvent.change(screen.getByLabelText(/nombre de usuario/), { target: { value: 'alex_test' } });
    fireEvent.change(screen.getByLabelText(/correo electrónico/), { target: { value: 'sin-arroba' } });
    fireEvent.click(screen.getByTestId('btn-submit-register'));

    const email = screen.getByLabelText(/correo electrónico/);
    await waitFor(() => expect(email.getAttribute('aria-invalid')).toBe('true'));
    expect(document.getElementById(email.getAttribute('aria-describedby')!)?.textContent).toBe(
      '/ El formato del correo electrónico no es válido.'
    );
    expect(document.activeElement).toBe(email);
    // El error de campo no se repite como error general
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('las credenciales incorrectas son un error del formulario, sin señalar un campo', async () => {
    render(<AuthView />);
    fireEvent.click(screen.getByTestId('btn-submit-login'));

    expect((await screen.findByRole('alert')).textContent).toBe('/ El correo electrónico o la contraseña son incorrectos.');
    expect(screen.getByLabelText(/correo electrónico/).getAttribute('aria-invalid')).toBeNull();
  });

  it('marca los requisitos de la contraseña a medida que se cumplen', () => {
    render(<AuthView />);
    fireEvent.click(screen.getByTestId('tab-register'));

    fireEvent.change(screen.getByLabelText(/^contraseña/), { target: { value: 'abcdefgh' } });

    const rules = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(rules).toContain('✓ mínimo 8 caracteres: cumplido');
    expect(rules).toContain('/ al menos un número: pendiente');
  });

  it('mientras verifica la sesión muestra VERIFICANDO SESIÓN con la barra de progreso', () => {
    useSession.setState({ status: 'bootstrapping' });
    render(<AuthView />);

    expect(screen.getByRole('heading', { name: /verificando sesión/i })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Verificando sesión' })).toBeTruthy();
  });
});

describe('DawnIntro', () => {
  beforeEach(() => {
    document.documentElement.dataset.ui = 'nuevo';
    localStorage.removeItem('discordia_intro_seen');
  });

  afterEach(() => {
    delete document.documentElement.dataset.ui;
  });

  it('sale en el primer ingreso y se saltea con una tecla', async () => {
    render(<DawnIntro />);
    expect(screen.getByTestId('dawn-intro')).toBeTruthy();
    expect(localStorage.getItem('discordia_intro_seen')).toBe('1');

    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => expect(screen.queryByTestId('dawn-intro')).toBeNull());
  });

  it('se saltea con un clic', async () => {
    render(<DawnIntro />);
    fireEvent.click(screen.getByTestId('dawn-intro'));

    await waitFor(() => expect(screen.queryByTestId('dawn-intro')).toBeNull());
  });

  it('no vuelve a salir si ya se vio', () => {
    localStorage.setItem('discordia_intro_seen', '1');
    render(<DawnIntro />);

    expect(screen.queryByTestId('dawn-intro')).toBeNull();
  });
});
