import { PLATFORM_STAFF_ROLE, ROLE_CLAIM } from '@discordia/core';
import type { AuthDriver } from './driver';

/**
 * Sesión simulada para desarrollo (VITE_USE_MOCK=true): entra como staff sin Auth0 ni backend. Con
 * ?rol=user en la URL entra como usuario común, para ver la pantalla "sin acceso". El build de
 * producción no la usa (config.useMock es false) y no abre nada: sin backend no hay datos.
 */

const role = () => (new URLSearchParams(window.location.search).get('rol') === 'user' ? 'user' : PLATFORM_STAFF_ROLE);

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
  async login() {
    signedIn = true;
    return 'done';
  },
  async logout() {
    signedIn = false;
    return 'done';
  },
};
