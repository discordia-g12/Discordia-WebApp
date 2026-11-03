import { Auth0Client } from '@auth0/auth0-spa-js';
import {
  AuthAdapter,
  AuthUser,
  configureAuth,
  databaseSignup,
  getAuthConfig,
  getTwoFactorStatus,
  passwordRealmLogin,
  PendingProfileStore,
  TwoFactorRequiredError,
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
const PENDING_TWO_FACTOR_KEY = 'discordia_pending_2fa';
const PENDING_USERNAME_KEY = 'discordia_pending_username';
const PENDING_DISPLAY_NAME_KEY = 'discordia_pending_display_name';

export function savePendingTwoFactor(data: { token: string; user: AuthUser; expiresIn?: number }) {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(PENDING_TWO_FACTOR_KEY, JSON.stringify(data));
  }
  useSession.setState({ pendingTwoFactor: data });
}

export function getPendingTwoFactor(): { token: string; user: AuthUser; expiresIn?: number } | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_TWO_FACTOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingTwoFactor() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(PENDING_TWO_FACTOR_KEY);
  }
  useSession.setState({ pendingTwoFactor: null });
}

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
   * - connection: nombre de la conexión (ej. 'google-oauth2' para login federado).
   */
  loginRedirect(opts?: { signup?: boolean; returnTo?: string; silent?: boolean; loginHint?: string; connection?: string }): Promise<void>;
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

/**
 * Sin tocar el estado de la sesión: true si hay una sesión guardada vigente o si se está volviendo del
 * login de Auth0 (/callback). Lo usa la pantalla de acceso para no mostrar el login mientras arranca una
 * sesión que probablemente exista.
 */
export function hasStoredSession(): boolean {
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(PENDING_TWO_FACTOR_KEY)) return false;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/callback')) return true;
  if (typeof sessionStorage === 'undefined') return false;
  try {
    const data = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? 'null');
    return Boolean(data?.token && data.expiresAt && Date.now() < data.expiresAt);
  } catch {
    return false;
  }
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
    if (getPendingTwoFactor()) {
      throw new Error('login_required');
    }

    // 1. Verificar token en memoria o sessionStorage si no se pide refresco forzado
    if (!opts?.forceRefresh) {
      if (currentAccessToken && Date.now() < tokenExpiresAt - 15000) {
        return currentAccessToken;
      }
      if (loadSession() && currentAccessToken && Date.now() < tokenExpiresAt - 15000) {
        return currentAccessToken;
      }
    }

    // 2. Intentar obtener/renovar el token con el SDK de Auth0
    try {
      const token = await auth0Client().getTokenSilently({
        cacheMode: opts?.forceRefresh ? 'off' : 'on',
        timeoutInSeconds: 8,
      });
      if (token) {
        let expMs = Date.now() + 86400 * 1000;
        try {
          const claims = await auth0Client().getIdTokenClaims();
          if (claims?.exp) {
            expMs = claims.exp * 1000;
          }
        } catch {
          // Si no se pueden leer claims, expMs queda en default (24h)
        }

        // Si entramos a la app con cookie de Auth0 pero sin sesión en sessionStorage, verificar si tiene 2FA
        if (!loadSession()) {
          try {
            const status = await getTwoFactorStatus(token);
            if (status.enabled) {
              const claimsUser = await auth0Provider.getUser();
              const userObj = claimsUser || ({} as AuthUser);
              savePendingTwoFactor({ token, user: userObj, expiresIn: Math.max(60, Math.floor((expMs - Date.now()) / 1000)) });
              clearSession();
              throw new Error('login_required');
            }
          } catch (statusErr) {
            if ((statusErr as Error)?.message === 'login_required') {
              throw statusErr;
            }
          }
        }

        currentAccessToken = token;
        tokenExpiresAt = expMs;
        const user = await auth0Provider.getUser();
        if (user) {
          saveSession(token, user, Math.max(60, Math.floor((expMs - Date.now()) / 1000)));
        }
        return token;
      }
    } catch (silentErr) {
      if ((silentErr as Error)?.message === 'login_required') {
        throw silentErr;
      }
      // Ignorar fallback silencioso si falla
    }

    // 3. Si teníamos token de sesión previo pero ya expiró y no se pudo renovar
    if (currentAccessToken && Date.now() >= tokenExpiresAt) {
      clearSession();
      throw new Error('session_expired: Tu sesión ha expirado.');
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
      const user = { ...claims, username: typeof username === 'string' ? username : claims.username };
      currentAuthUser = user;
      return user;
    } catch {
      return undefined;
    }
  },

  async handleCallback(): Promise<{ returnTo?: string }> {
    const result = await auth0Client().handleRedirectCallback();
    try {
      const token = await auth0Client().getTokenSilently();
      const claims = await auth0Client().getIdTokenClaims();
      const expSeconds = claims?.exp ? Math.max(60, claims.exp - Math.floor(Date.now() / 1000)) : 86400;
      const user = await auth0Provider.getUser();
      if (token && user) {
        // Si el usuario tiene 2FA activo, exigir verificación antes de otorgar sesión (CA 2)
        try {
          const status = await getTwoFactorStatus(token);
          if (status.enabled) {
            savePendingTwoFactor({ token, user, expiresIn: expSeconds });
            clearSession();
            return { returnTo: '/login' };
          }
        } catch {
          // Si falla la consulta de status, continuar normalmente
        }
        saveSession(token, user, expSeconds);
      }
    } catch {
      // Ignorar fallo de precarga; bootstrap lo resolverá en getToken
    }
    return {
      returnTo: (result.appState as { returnTo?: string } | undefined)?.returnTo,
    };
  },

  async loginRedirect(opts?: { signup?: boolean; returnTo?: string; silent?: boolean; loginHint?: string; connection?: string }): Promise<void> {
    clearSession();
    await auth0Client().loginWithRedirect({
      appState: { returnTo: opts?.returnTo },
      authorizationParams: {
        ...(opts?.connection ? { connection: opts.connection } : {}),
        ...(opts?.signup ? { screen_hint: 'signup' } : {}),
        ...(opts?.silent ? { prompt: 'none' } : {}),
        ...(opts?.loginHint ? { login_hint: opts.loginHint } : {}),
      },
    });
  },

  async loginWithCredentials(credentials: { email: string; password: string }): Promise<void> {
    // Se descarta la sesión anterior antes de intentar: si este login falla (contraseña, email sin
    // verificar), no tiene que quedar vivo el token de otra cuenta. Con él, el arranque siguiente creaba
    // el perfil nuevo a nombre de la cuenta anterior.
    clearSession();
    const { accessToken, user, expiresIn } = await passwordRealmLogin(credentials);

    // Si el usuario tiene 2FA activo, requerir el segundo factor antes de otorgar la sesión (CA 2, CA 3, CA 4)
    try {
      const status = await getTwoFactorStatus(accessToken);
      if (status.enabled) {
        throw new TwoFactorRequiredError(accessToken, user, expiresIn);
      }
    } catch (err) {
      if (err instanceof TwoFactorRequiredError) {
        throw err;
      }
    }

    saveSession(accessToken, user, expiresIn);
  },

  async completeTwoFactorSession(token: string, user: AuthUser, expiresInSeconds: number = 86400): Promise<void> {
    clearPendingTwoFactor();
    saveSession(token, user, expiresInSeconds);
  },

  async signupWithCredentials(signupData: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
  }): Promise<void> {
    clearSession();
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
    clearPendingTwoFactor();
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
      const pending2fa = getPendingTwoFactor();
      const target = pending2fa ? '/login' : (returnTo || '/');
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

  async onMissingSession(err: unknown) {
    // Los errores del SDK de Auth0 traen el código en `error` (login_required, consent_required...)
    const { message, error } = (err ?? {}) as { message?: unknown; error?: unknown };
    const errorMsg = String(message || error || '');
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
