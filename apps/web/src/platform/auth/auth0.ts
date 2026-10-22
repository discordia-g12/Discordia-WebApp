import { Auth0Client } from '@auth0/auth0-spa-js';
import {
  AuthAdapter,
  AuthUser,
  configureAuth,
  databaseSignup,
  getAuthConfig,
  passwordRealmLogin,
  PendingProfileStore,
  USERNAME_CLAIM,
  useSession,
} from '@discordia/core';

// La configuración de Auth0 entra a core desde acá (variables de Vite)
configureAuth({
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'dev-dppme5iaqg60gkmo.us.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || 'f2H8PhlKDl3KSIm64G5mHAeQih7iFyIP',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.discordia.com',
});

const SESSION_STORAGE_KEY = 'discordia_auth_session';
const PENDING_USERNAME_KEY = 'discordia_pending_username';
const PENDING_DISPLAY_NAME_KEY = 'discordia_pending_display_name';

/** Adaptador web: además del contrato común, el flujo de redirección de Universal Login. */
export interface WebAuthAdapter extends AuthAdapter {
  /**
   * Procesa la respuesta de callback tras la redirección del proveedor de identidad.
   * Retorna el returnTo original si existía en appState.
   */
  handleCallback(): Promise<{ returnTo?: string }>;

  /**
   * Inicia el flujo de autenticación por redirección.
   * - signup: true para abrir la pantalla de registro (screen_hint=signup).
   * - silent: true para fallback C (prompt=none).
   * - returnTo: ruta a la que volver tras la autenticación.
   * - loginHint: email del usuario para precargar en Auth0.
   */
  loginRedirect(opts?: { signup?: boolean; returnTo?: string; silent?: boolean; loginHint?: string }): Promise<void>;
}

let client: Auth0Client | null = null;

/* Instancia singleton de Auth0Client (se crea al primer uso, con la configuración ya cargada) */
function auth0Client(): Auth0Client {
  if (!client) {
    const { domain, clientId, audience } = getAuthConfig();
    client = new Auth0Client({
      domain,
      clientId,
      cacheLocation: 'memory',
      useRefreshTokens: false,
      authorizationParams: {
        audience,
        redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/callback` : '',
      },
    });
  }
  return client;
}

let currentAccessToken: string | null = null;
let currentAuthUser: AuthUser | null = null;
let tokenExpiresAt: number = 0;

function saveSession(token: string, user: AuthUser, expiresInSeconds: number) {
  currentAccessToken = token;
  currentAuthUser = user;
  tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token,
        user,
        expiresAt: tokenExpiresAt,
      })
    );
  }
}

function loadSession(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.expiresAt && Date.now() < data.expiresAt && data.token) {
      currentAccessToken = data.token;
      currentAuthUser = data.user;
      tokenExpiresAt = data.expiresAt;
      return true;
    }
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignorar fallo de parseo
  }
  return false;
}

function clearSession() {
  currentAccessToken = null;
  currentAuthUser = null;
  tokenExpiresAt = 0;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function currentPath(): { pathname: string; search: string } {
  return {
    pathname: typeof window !== 'undefined' ? window.location.pathname : '',
    search: typeof window !== 'undefined' ? window.location.search : '',
  };
}

/** Username y nombre elegidos al registrarse: en sessionStorage, sobreviven a la redirección a Auth0. */
export const sessionStoragePendingProfile: PendingProfileStore = {
  save({ username, displayName }) {
    if (typeof sessionStorage === 'undefined') return;
    if (username) sessionStorage.setItem(PENDING_USERNAME_KEY, username);
    if (displayName) sessionStorage.setItem(PENDING_DISPLAY_NAME_KEY, displayName);
  },
  take() {
    if (typeof sessionStorage === 'undefined') return {};
    const username = sessionStorage.getItem(PENDING_USERNAME_KEY) ?? undefined;
    const displayName = sessionStorage.getItem(PENDING_DISPLAY_NAME_KEY) ?? undefined;
    sessionStorage.removeItem(PENDING_USERNAME_KEY);
    sessionStorage.removeItem(PENDING_DISPLAY_NAME_KEY);
    return { username, displayName };
  },
};

export const auth0Provider: WebAuthAdapter = {
  async getToken(opts?: { forceRefresh?: boolean }): Promise<string> {
    // 1. Verificar token en memoria o sessionStorage si no se pide refresco forzado
    if (!opts?.forceRefresh) {
      if (currentAccessToken && Date.now() < tokenExpiresAt - 15000) {
        return currentAccessToken;
      }
      if (loadSession() && currentAccessToken && Date.now() < tokenExpiresAt - 15000) {
        return currentAccessToken;
      }
    }

    // 2. Si el token de sesión expiró
    if (currentAccessToken && Date.now() >= tokenExpiresAt) {
      clearSession();
      throw new Error('session_expired: Tu sesión ha expirado.');
    }

    // 3. Fallback a getTokenSilently de Auth0 SPA SDK
    try {
      const token = await auth0Client().getTokenSilently({
        cacheMode: opts?.forceRefresh ? 'off' : 'on',
        timeoutInSeconds: 8,
      });
      if (token) {
        currentAccessToken = token;
        return token;
      }
    } catch {
      // Ignorar fallback silencioso si falla
    }

    throw new Error('login_required');
  },

  async getUser(): Promise<AuthUser | undefined> {
    if (currentAuthUser) {
      return currentAuthUser;
    }
    if (loadSession() && currentAuthUser) {
      return currentAuthUser;
    }
    try {
      // Flujo Universal Login: getUser() devuelve los claims crudos del ID token.
      const claims = (await auth0Client().getUser()) as (AuthUser & Record<string, unknown>) | undefined;
      if (!claims) return undefined;
      const username = claims[USERNAME_CLAIM];
      return { ...claims, username: typeof username === 'string' ? username : claims.username };
    } catch {
      return undefined;
    }
  },

  async handleCallback(): Promise<{ returnTo?: string }> {
    const result = await auth0Client().handleRedirectCallback();
    return {
      returnTo: (result.appState as { returnTo?: string } | undefined)?.returnTo,
    };
  },

  async loginRedirect(opts?: { signup?: boolean; returnTo?: string; silent?: boolean; loginHint?: string }): Promise<void> {
    await auth0Client().loginWithRedirect({
      appState: { returnTo: opts?.returnTo },
      authorizationParams: {
        ...(opts?.signup ? { screen_hint: 'signup' } : {}),
        ...(opts?.silent ? { prompt: 'none' } : {}),
        ...(opts?.loginHint ? { login_hint: opts.loginHint } : {}),
      },
    });
  },

  async loginWithCredentials(credentials: { email: string; password: string }): Promise<void> {
    const { accessToken, user, expiresIn } = await passwordRealmLogin(credentials);
    saveSession(accessToken, user, expiresIn);
  },

  async signupWithCredentials(signupData: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
  }): Promise<void> {
    await databaseSignup(signupData);

    // CA 1: Registro exitoso -> Autenticación automática.
    // Con la verificación de email obligatoria, este login lanza
    // EmailNotVerifiedError: la cuenta YA quedó creada en Auth0 (y el mail de
    // verificación enviado), así que no es un fallo del registro. La sesión lo
    // traduce al estado 'email_unverified'.
    await auth0Provider.loginWithCredentials({
      email: signupData.email,
      password: signupData.password,
    });
  },

  async logout(): Promise<void> {
    clearSession();
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      await auth0Client().logout({
        logoutParams: {
          returnTo: `${origin}/login`,
        },
        openUrl: false,
      });
    } catch {
      // Limpieza local completada
    }
  },

  async completeRedirect(): Promise<void> {
    if (currentPath().pathname !== '/callback') return;
    try {
      const { returnTo } = await auth0Provider.handleCallback();
      const target = returnTo || '/';
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', target);
      }
    } catch (err) {
      // Limpiar ?error=...&state=... de la URL en TODAS las ramas: si queda,
      // un refresh vuelve a procesar un state ya consumido ("Invalid state").
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/login');
      }
      throw err;
    }
  },

  async onMissingSession(err: any) {
    const errorMsg = String(err?.message || err?.error || '');
    const { pathname, search } = currentPath();

    // En rutas de inicio (/ o /login), si no hay sesión activa por cualquier motivo,
    // el usuario simplemente no está autenticado -> mostrar el formulario de login / sign up
    if (pathname === '/' || pathname === '/login' || pathname === '/callback' || useSession.getState().isMock) {
      return 'unauthenticated';
    }

    // Si estamos en una ruta protegida profunda (ej: /channels/c1) y silent auth falló
    const isLoginRequired =
      errorMsg.includes('login_required') ||
      errorMsg.includes('consent_required') ||
      errorMsg.includes('missing_refresh_token') ||
      errorMsg.toLowerCase().includes('timeout');

    if (!isLoginRequired) return 'error';

    // Fallback C: redirección de primer nivel con prompt=none preservando returnTo
    await auth0Provider.loginRedirect({
      silent: true,
      returnTo: `${pathname}${search}`,
    });
    return 'redirected';
  },

  async onSessionLost() {
    const { pathname, search } = currentPath();

    // Si estamos en login o callback, no disparar redirect
    if (pathname === '/login' || pathname === '/callback') {
      return 'unauthenticated';
    }

    // Fallback: redirigir con prompt=none preservando returnTo
    await auth0Provider.loginRedirect({
      silent: true,
      returnTo: `${pathname}${search}`,
    });
    return 'redirected';
  },

  pendingProfile: sessionStoragePendingProfile,
};
