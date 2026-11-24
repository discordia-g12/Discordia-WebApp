import { PLATFORM_STAFF_ROLE, ROLE_CLAIM } from '@discordia/core';
import type { AuthDriver } from './driver';

/**
 * Sesión simulada para desarrollo (VITE_USE_MOCK=true): entra como staff sin Auth0 ni backend. En la URL:
 * - `?rol=user`: entra como usuario común, para ver la pantalla "sin acceso".
 * - `?2fa=1`: la cuenta tiene la 2FA activa; el código válido es 123456.
 * El build de producción no la usa (config.useMock es false) y no abre nada: sin backend no hay datos.
 */

const params = () => new URLSearchParams(window.location.search);
const role = () => (params().get('rol') === 'user' ? 'user' : PLATFORM_STAFF_ROLE);

/** Código que acepta el mock en el paso de la 2FA. */
export const MOCK_TWO_FACTOR_CODE = '123456';

// JWT sin firma: el cliente solo lee el claim de rol, la firma la valida Kong
const mockToken = () => ['e30', btoa(JSON.stringify({ sub: 'mock|staff', [ROLE_CLAIM]: role() })), 'mock'].join('.');

let signedIn = true;

export const mockDriver: AuthDriver = {
  async start() {
    return signedIn ? mockToken() : null;
  },
  async getToken() {
    if (!signedIn) throw Object.assign(new Error('mock sin sesión'), { error: 'login_required' });
    return mockToken();
  },
  async getUser() {
    return { name: 'Staff de prueba', email: 'staff@discordia.lol' };
  },
  async loginWithPassword() {
    signedIn = true;
    return mockToken();
  },
  async loginWithGoogle() {
    signedIn = true;
    return 'done';
  },
  async requestPasswordReset() {},
  async isTwoFactorEnabled() {
    return params().get('2fa') === '1';
  },
  async verifyTwoFactor(code) {
    return { valid: code === MOCK_TWO_FACTOR_CODE, recoveryCodeUsed: false };
  },
  async logout() {
    signedIn = false;
    return 'done';
  },
};
