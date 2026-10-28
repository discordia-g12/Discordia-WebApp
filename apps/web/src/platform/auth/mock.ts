import { PLATFORM_STAFF_ROLE, ROLE_CLAIM, retryBootstrap, type AuthUser } from '@discordia/core';
import type { WebAuthAdapter } from './auth0';

// JWT sin firma con el rol staff: así se puede recorrer el backoffice sin Auth0. Solo existe con VITE_USE_MOCK en
// desarrollo (el build de producción no lo incluye) y no abre nada: en este modo no hay backend.
const MOCK_TOKEN = ['e30', btoa(JSON.stringify({ sub: 'mock|u0', [ROLE_CLAIM]: PLATFORM_STAFF_ROLE })), 'mock'].join('.');

/**
 * Proveedor de autenticación simulado (Mock) exclusivo para desarrollo local (DEV).
 * Permite probar todos los flujos de interfaz (login, onboarding, logout) sin requerir
 * conexión activa con Auth0 ni backend local levantado.
 */
let mockAuthenticated = false;
let mockNeedsProfile = false;

export function isMockNeedsProfile(): boolean {
  return mockNeedsProfile;
}

export function setMockProfileCompleted(): void {
  mockNeedsProfile = false;
}

export const mockProvider: WebAuthAdapter = {
  async getToken(): Promise<string> {
    if (!mockAuthenticated) {
      throw new Error('login_required: mock session unauthenticated');
    }
    return MOCK_TOKEN;
  },

  async getUser(): Promise<AuthUser> {
    return {
      sub: 'mock|u0',
      email: 'alex.rivera@discordia.gg',
      nickname: 'alexr',
      name: 'Alex Rivera',
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    };
  },

  async handleCallback(): Promise<{ returnTo?: string }> {
    mockAuthenticated = true;
    return { returnTo: '/' };
  },

  async loginRedirect(opts?: { signup?: boolean; returnTo?: string; silent?: boolean }): Promise<void> {
    mockAuthenticated = true;
    mockNeedsProfile = Boolean(opts?.signup);
    await retryBootstrap();
  },

  async loginWithCredentials(credentials: { email: string; password: string }): Promise<void> {
    if (!credentials.email || !credentials.password) {
      throw new Error('El correo electrónico o la contraseña son incorrectos.');
    }
    mockAuthenticated = true;
    mockNeedsProfile = false;
  },

  async signupWithCredentials(data: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
  }): Promise<void> {
    if (data.email === 'taken@discordia.gg') {
      throw new Error('El correo electrónico ya está en uso.');
    }
    mockAuthenticated = true;
    mockNeedsProfile = false;
  },

  async logout(): Promise<void> {
    mockAuthenticated = false;
    mockNeedsProfile = false;
  },
};
