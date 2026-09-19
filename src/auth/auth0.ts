import { Auth0Client } from '@auth0/auth0-spa-js';
import { AuthProvider, AuthUser } from './provider';

const DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || 'dev-dppme5iaqg60gkmo.us.auth0.com';
const CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || 'f2H8PhlKDl3KSIm64G5mHAeQih7iFyIP';
const AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.discordia.com';
const CONNECTION = 'Username-Password-Authentication';
const SESSION_STORAGE_KEY = 'discordia_auth_session';

/* Instancia singleton de Auth0Client para compatibilidad */
export const auth0Client = new Auth0Client({
  domain: DOMAIN,
  clientId: CLIENT_ID,
  cacheLocation: 'memory',
  useRefreshTokens: false,
  authorizationParams: {
    audience: AUDIENCE,
    redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/callback` : '',
  },
});

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

export const auth0Provider: AuthProvider = {
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
      const token = await auth0Client.getTokenSilently({
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
      return (await auth0Client.getUser()) as AuthUser;
    } catch {
      return undefined;
    }
  },

  async handleCallback(): Promise<{ returnTo?: string }> {
    const result = await auth0Client.handleRedirectCallback();
    return {
      returnTo: (result.appState as { returnTo?: string } | undefined)?.returnTo,
    };
  },

  async loginRedirect(opts?: { signup?: boolean; returnTo?: string; silent?: boolean; loginHint?: string }): Promise<void> {
    await auth0Client.loginWithRedirect({
      appState: { returnTo: opts?.returnTo },
      authorizationParams: {
        ...(opts?.signup ? { screen_hint: 'signup' } : {}),
        ...(opts?.silent ? { prompt: 'none' } : {}),
        ...(opts?.loginHint ? { login_hint: opts.loginHint } : {}),
      },
    });
  },

  async loginWithCredentials(credentials: { email: string; password: string }): Promise<void> {
    const res = await fetch(`https://${DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
        client_id: CLIENT_ID,
        username: credentials.email,
        password: credentials.password,
        realm: CONNECTION,
        audience: AUDIENCE,
        scope: 'openid profile email',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      // Criterios de aceptación Login CA 2 y CA 3:
      // Error genérico sin revelar si el fallo fue el email o la contraseña
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error('El correo electrónico o la contraseña son incorrectos.');
      }
      throw new Error(data.error_description || data.error || 'Error al autenticar credenciales.');
    }

    const accessToken = data.access_token;
    const expiresIn = Number(data.expires_in) || 86400;

    let user: AuthUser = {
      email: credentials.email,
      nickname: credentials.email.split('@')[0],
      name: credentials.email.split('@')[0],
    };

    if (data.id_token) {
      try {
        const parts = data.id_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          user = {
            sub: payload.sub,
            email: payload.email || credentials.email,
            nickname: payload.nickname || credentials.email.split('@')[0],
            name: payload.name || payload.nickname || credentials.email.split('@')[0],
            picture: payload.picture,
          };
        }
      } catch {
        // Fallback a claims básicos
      }
    }

    saveSession(accessToken, user, expiresIn);
  },

  async signupWithCredentials(signupData: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
  }): Promise<void> {
    const res = await fetch(`https://${DOMAIN}/dbconnections/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        email: signupData.email,
        password: signupData.password,
        connection: CONNECTION,
        username: signupData.username,
        user_metadata: {
          name: signupData.displayName || signupData.username,
          username: signupData.username,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      // Criterio de Aceptación Registro CA 2: Email ya registrado
      if (
        data.code === 'invalid_signup' ||
        (typeof data.description === 'string' && data.description.toLowerCase().includes('sign up'))
      ) {
        throw new Error('El correo electrónico ya está en uso.');
      }

      // Criterio de Aceptación Registro CA 4: Contraseña insegura
      if (data.name === 'PasswordStrengthError') {
        const minLength =
          data.description?.rules?.find((r: any) => r.code === 'lengthAtLeast')?.format?.[0] || 15;
        throw new Error(
          `La contraseña no cumple con los requisitos de seguridad (mínimo ${minLength} caracteres).`
        );
      }

      throw new Error(data.description || data.message || 'Error al crear la cuenta.');
    }

    // CA 1: Registro exitoso -> Autenticación automática e ingreso inmediato a la plataforma
    await this.loginWithCredentials!({
      email: signupData.email,
      password: signupData.password,
    });
  },

  async logout(): Promise<void> {
    clearSession();
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      await auth0Client.logout({
        logoutParams: {
          returnTo: `${origin}/login`,
        },
        openUrl: false,
      });
    } catch {
      // Limpieza local completada
    }
  },
};

