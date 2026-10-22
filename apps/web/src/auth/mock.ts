import { retryBootstrap } from '@discordia/core';
import type { WebAuthAdapter } from './auth0';

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
    return 'mock.jwt.token_for_local_development';
  },

  async getUser(): Promise<any> {
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
