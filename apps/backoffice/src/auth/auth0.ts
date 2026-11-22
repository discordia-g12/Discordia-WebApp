import { Auth0Client } from '@auth0/auth0-spa-js';
import { getTwoFactorStatus, passwordRealmLogin, requestPasswordReset, verifyTwoFactor } from '@discordia/core';
import { config } from '../config';
import type { AuthDriver, StaffUser } from './driver';
import { isSignedOutError } from './errors';

/**
 * Login del backoffice (ADR-03): formulario propio con email y contraseña (grant password-realm, como la
 * web) o Google (redirección a Auth0 con la conexión de Google, que no muestra la pantalla de Auth0). Usa
 * su propia aplicación de Auth0: la Action de login rechaza ahí mismo a quien no es staff
 * (Gateway/auth0/post-login-action.js), así que un usuario común ni siquiera obtiene un token.
 *
 * El token vive solo en memoria (no en sessionStorage como la web):
 * - Con contraseña no hay sesión de Auth0 que renovar: al recargar o cuando vence el token, se vuelve a
 *   pedir la contraseña.
 * - Con Google, al recargar se pide de nuevo con la sesión de Auth0 (iframe oculto). Si el navegador bloquea
 *   esa cookie, se vuelve a tocar Google y la redirección vuelve enseguida.
 */

const GOOGLE_CONNECTION = 'google-oauth2';

let client: Auth0Client | null = null;

/** Sesión del login con contraseña: el token de /oauth/token, hasta que vence. */
let passwordSession: { token: string; expiresAt: number; user: StaffUser } | null = null;

const signedOut = (message: string) => Object.assign(new Error(message), { error: 'login_required' });

function requireClientId(): void {
  if (!config.auth0.clientId) {
    throw new Error('Falta VITE_AUTH0_CLIENT_ID: el client ID de la aplicación "Discordia Backoffice" en Auth0 (ver .env.example).');
  }
}

function auth0Client(): Auth0Client {
  requireClientId();
  client ??= new Auth0Client({
    domain: config.auth0.domain,
    clientId: config.auth0.clientId,
    cacheLocation: 'memory',
    useRefreshTokens: false,
    // El iframe oculto espera 60 s por defecto: con la sesión de Auth0 responde en menos de uno. Si no
    // responde, mejor mostrar el login enseguida que dejar "verificando tu sesión" un minuto
    authorizeTimeoutInSeconds: 8,
    authorizationParams: {
      audience: config.auth0.audience,
      redirect_uri: `${window.location.origin}/callback`,
    },
  });
  return client;
}

export const auth0Driver: AuthDriver = {
  async start() {
    // Arrancar (o reintentar) empieza de cero: la sesión de contraseña no se renueva, se vuelve a entrar
    passwordSession = null;
    const auth0 = auth0Client();
    if (window.location.pathname === '/callback') {
      try {
        const { appState } = await auth0.handleRedirectCallback<{ returnTo?: string }>();
        window.history.replaceState({}, '', appState?.returnTo || '/');
      } catch (err) {
        // Sacar ?code=&state= (o ?error=) de la URL: si quedan, recargar vuelve a procesar un state usado
        window.history.replaceState({}, '', '/');
        throw err;
      }
    }
    try {
      // Sin token (el SDK lo tipa como posible undefined) es lo mismo que no tener sesión
      return (await auth0.getTokenSilently()) || null;
    } catch (err) {
      if (isSignedOutError(err)) return null;
      throw err;
    }
  },

  async getToken(opts) {
    if (passwordSession) {
      // Sin refresh token: vencido, hay que volver a entrar (la sesión pasa a "sin sesión" por el 401)
      if (passwordSession.expiresAt <= Date.now()) {
        passwordSession = null;
        throw signedOut('La sesión venció');
      }
      return passwordSession.token;
    }
    const token = await auth0Client().getTokenSilently({ cacheMode: opts?.forceRefresh ? 'off' : 'on' });
    if (!token) throw signedOut('Sin sesión de Auth0');
    return token;
  },

  async getUser(): Promise<StaffUser> {
    if (passwordSession) return passwordSession.user;
    const user = await auth0Client().getUser();
    return {
      name: user?.name || user?.nickname || user?.email || 'staff',
      email: user?.email || '',
      picture: user?.picture,
    };
  },

  async loginWithPassword(credentials) {
    requireClientId();
    passwordSession = null;
    const { accessToken, expiresIn, user } = await passwordRealmLogin(credentials);
    passwordSession = {
      token: accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      user: { name: user.name || user.nickname || user.email || 'staff', email: user.email || credentials.email, picture: user.picture },
    };
    return accessToken;
  },

  async loginWithGoogle() {
    passwordSession = null;
    const { pathname, search } = window.location;
    await auth0Client().loginWithRedirect({
      authorizationParams: { connection: GOOGLE_CONNECTION },
      appState: { returnTo: pathname === '/callback' ? '/' : `${pathname}${search}` },
    });
    return 'redirected';
  },

  requestPasswordReset,

  async isTwoFactorEnabled(token) {
    return (await getTwoFactorStatus(token)).enabled;
  },

  async verifyTwoFactor(code, token) {
    const result = await verifyTwoFactor(code, token);
    return { valid: result.valid, recoveryCodeUsed: result.recovery_code_used };
  },

  async logout() {
    if (passwordSession) {
      // Con contraseña no hay sesión de Auth0 que cerrar: alcanza con olvidar el token
      passwordSession = null;
      return 'done';
    }
    await auth0Client().logout({ logoutParams: { returnTo: window.location.origin } });
    return 'redirected';
  },
};
