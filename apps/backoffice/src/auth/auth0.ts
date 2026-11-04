import { Auth0Client } from '@auth0/auth0-spa-js';
import { config } from '../config';
import type { AuthDriver, StaffUser } from './driver';
import { isSignedOutError } from './errors';

/**
 * Login del backoffice: Universal Login de Auth0 (redirección), con su propia aplicación de Auth0. La
 * Action de login rechaza ahí mismo a quien no es staff (Gateway/auth0/post-login-action.js), así que un
 * usuario común ni siquiera obtiene un token para este dominio.
 *
 * El token vive solo en memoria (no en sessionStorage como la web): al recargar se pide de nuevo con la
 * sesión de Auth0 (iframe oculto). Si el navegador bloquea esa cookie, se muestra el botón "entrar" y la
 * redirección vuelve enseguida, sin pedir la contraseña otra vez.
 */

let client: Auth0Client | null = null;

function auth0Client(): Auth0Client {
  if (!config.auth0.clientId) {
    throw new Error('Falta VITE_AUTH0_CLIENT_ID: el client ID de la aplicación "Discordia Backoffice" en Auth0 (ver .env.example).');
  }
  client ??= new Auth0Client({
    domain: config.auth0.domain,
    clientId: config.auth0.clientId,
    cacheLocation: 'memory',
    useRefreshTokens: false,
    // El iframe oculto espera 60 s por defecto: con la sesión de Auth0 responde en menos de uno. Si no
    // responde, mejor mostrar "entrar" enseguida que dejar "verificando tu sesión" un minuto
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
    const token = await auth0Client().getTokenSilently({ cacheMode: opts?.forceRefresh ? 'off' : 'on' });
    if (!token) throw Object.assign(new Error('Sin sesión de Auth0'), { error: 'login_required' });
    return token;
  },

  async getUser(): Promise<StaffUser> {
    const user = await auth0Client().getUser();
    return {
      name: user?.name || user?.nickname || user?.email || 'staff',
      email: user?.email || '',
      picture: user?.picture,
    };
  },

  async login() {
    const { pathname, search } = window.location;
    await auth0Client().loginWithRedirect({
      appState: { returnTo: pathname === '/callback' ? '/' : `${pathname}${search}` },
    });
    return 'redirected';
  },

  async logout() {
    await auth0Client().logout({ logoutParams: { returnTo: window.location.origin } });
    return 'redirected';
  },
};
