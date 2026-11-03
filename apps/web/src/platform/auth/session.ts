import {
  backToLogin,
  bootstrap,
  getAuthAdapter,
  loginWithCredentials,
  logout,
  retryBootstrap,
  setApiMock,
  setAuthAdapter,
  setAuthAdapterResolver,
  signupWithCredentials,
  useSession,
} from '@discordia/core';
import { auth0Provider, WebAuthAdapter } from './auth0';
export { hasStoredSession } from './auth0';

/**
 * Sesión del cliente web: la máquina de estados es la de @discordia/core; acá se elige el adaptador
 * (Auth0 SPA, o el mock en desarrollo con VITE_USE_MOCK) y se exponen las acciones que usa la UI.
 */

export { useSession, bootstrap, retryBootstrap, logout, registerQueryCacheCleaner } from '@discordia/core';
export type { SessionState, SessionStatus, SessionError } from '@discordia/core';

setAuthAdapter(auth0Provider);

/**
 * Resuelve el adaptador adecuado (Auth0 real o Mock en DEV si VITE_USE_MOCK === 'true').
 */
setAuthAdapterResolver(async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    const { mockProvider } = await import('./mock');
    const { apiMock } = await import('../apiMock');
    setApiMock(apiMock);
    useSession.getState().setStatus(useSession.getState().status, { isMock: true });
    return mockProvider;
  }
  return auth0Provider;
});

export const authService = {
  login: (opts?: { signup?: boolean; returnTo?: string; loginHint?: string; connection?: string }) =>
    (getAuthAdapter() as WebAuthAdapter).loginRedirect(opts),
  loginWithGoogle: () =>
    (getAuthAdapter() as WebAuthAdapter).loginRedirect({ connection: 'google-oauth2' }),
  loginWithCredentials,
  signupWithCredentials,
  logout,
  backToLogin,
  bootstrap,
  retryBootstrap,
};
