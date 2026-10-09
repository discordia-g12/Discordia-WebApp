import { create } from 'zustand';
import { AuthProvider } from './provider';
import { auth0Provider } from './auth0';
import { getMyProfile, upsertMyProfile, UserProfile } from '../api/users';
import { ApiError, isProblemType, PROBLEM_TYPES } from '../api/errors';
import { configureClient } from '../api/client';
import { AuthDenial, classifyAuthDenial } from './errors';

export type SessionStatus =
  | 'bootstrapping'   // resolviendo callback / silent auth
  | 'unauthenticated' // sin sesión: mostrar /login
  | 'needs_profile'   // autenticado en Auth0, sin perfil en Discordia
  | 'email_unverified' // credenciales válidas, pero Auth0 exige verificar el email
  | 'authenticated'   // sesión + perfil cargado
  | 'suspended'       // cuenta bloqueada 
  | 'error';          // fallo de red/servicio: mostrar reintento

export interface SessionError {
  title?: string;
  detail?: string;
  message?: string;
}

export interface SessionState {
  status: SessionStatus;
  profile: UserProfile | null;
  error: SessionError | null;
  isMock: boolean;
  pendingEmail: string | null;
  setStatus: (status: SessionStatus, extra?: Partial<SessionState>) => void;
}

export const useSession = create<SessionState>((set) => ({
  status: 'bootstrapping',
  profile: null,
  error: null,
  isMock: false,
  pendingEmail: null,
  setStatus: (status, extra = {}) => set((state) => ({ ...state, status, ...extra })),
}));

// Proveedor de autenticación activo
let activeProvider: AuthProvider = auth0Provider;
let isProviderExplicitlySet = false;

export function setAuthProvider(provider: AuthProvider) {
  activeProvider = provider;
  isProviderExplicitlySet = true;
}

export function getAuthProvider(): AuthProvider {
  return activeProvider;
}

// Callback opcional para limpiar el caché de react-query al cerrar sesión
let onClearQueryCache: (() => void) | null = null;
export function registerQueryCacheCleaner(fn: () => void) {
  onClearQueryCache = fn;
}

// Configurar el cliente HTTP desacoplado
configureClient({
  getToken: (opts) => activeProvider.getToken(opts),
  onAuthFailure: () => handleAuthFailure(),
});

/**
 * Resuelve el proveedor adecuado (Auth0 real o Mock en DEV si VITE_USE_MOCK === 'true').
 */
async function resolveProvider(): Promise<AuthProvider> {
  if (isProviderExplicitlySet) {
    return activeProvider;
  }
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    const { mockProvider } = await import('./mock');
    useSession.getState().setStatus(useSession.getState().status, { isMock: true });
    activeProvider = mockProvider;
    return mockProvider;
  }
  activeProvider = auth0Provider;
  return auth0Provider;
}

/**
 * Traduce un rechazo del IdP (ver auth/errors.ts) al estado de sesión correspondiente.
 */
function applyAuthDenial(denial: AuthDenial, email?: string | null) {
  if (denial === 'email_not_verified') {
    useSession.getState().setStatus('email_unverified', {
      profile: null,
      error: null,
      pendingEmail: email ?? useSession.getState().pendingEmail ?? null,
    });
    return;
  }
  useSession.getState().setStatus('suspended', {
    profile: null,
    error: { title: 'Acceso Denegado', message: 'Tu cuenta se encuentra suspendida.' },
  });
}

/**
 * Acción invocada cuando el cliente HTTP sufre un 401 que no pudo renovarse en plena sesión.
 */
export async function handleAuthFailure() {
  if (onClearQueryCache) {
    onClearQueryCache();
  }

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const search = typeof window !== 'undefined' ? window.location.search : '';

  // Si estamos en login o callback, no disparar redirect
  if (pathname === '/login' || pathname === '/callback') {
    useSession.getState().setStatus('unauthenticated', { profile: null });
    return;
  }

  // Fallback: redirigir con prompt=none preservando returnTo
  try {
    await activeProvider.loginRedirect({
      silent: true,
      returnTo: `${pathname}${search}`,
    });
  } catch {
    useSession.getState().setStatus('unauthenticated', { profile: null });
  }
}

/**
 * Cierre de sesión seguro y limpieza de estado.
 */
export async function logout() {
  if (onClearQueryCache) {
    onClearQueryCache();
  }
  useSession.getState().setStatus('unauthenticated', { profile: null, error: null, pendingEmail: null });
  await activeProvider.logout();
}

/**
 * Orquestador principal de inicialización de sesión con protección contra StrictMode.
 */
let bootstrapPromise: Promise<void> | null = null;

export const bootstrap = () => (bootstrapPromise ??= runBootstrap());
export const retryBootstrap = () => {
  bootstrapPromise = null;
  return bootstrap();
};

async function runBootstrap(): Promise<void> {
  useSession.getState().setStatus('bootstrapping', { error: null });

  const provider = await resolveProvider();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const search = typeof window !== 'undefined' ? window.location.search : '';

  if (pathname === '/callback') {
    try {
      const { returnTo } = await provider.handleCallback();
      const target = returnTo || '/';
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', target);
      }
    } catch (err: any) {
      // Limpiar ?error=...&state=... de la URL en TODAS las ramas: si queda,
      // un refresh vuelve a procesar un state ya consumido ("Invalid state").
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/login');
      }

      const denial = classifyAuthDenial(err);
      if (denial) {
        applyAuthDenial(denial);
        return;
      }

      useSession.getState().setStatus('unauthenticated', { profile: null });
      return;
    }
  }

  try {
    await provider.getToken();
  } catch (err: any) {
    const errorMsg = String(err?.message || err?.error || '');

    const denial = classifyAuthDenial(err);
    if (denial) {
      applyAuthDenial(denial);
      return;
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    // En rutas de inicio (/ o /login), si no hay sesión activa por cualquier motivo,
    // el usuario simplemente no está autenticado -> mostrar el formulario de login / sign up
    if (currentPath === '/' || currentPath === '/login' || currentPath === '/callback' || useSession.getState().isMock) {
      useSession.getState().setStatus('unauthenticated', { profile: null });
      return;
    }

    // Si estamos en una ruta protegida profunda (ej: /channels/c1) y silent auth falló
    const isLoginRequired =
      errorMsg.includes('login_required') ||
      errorMsg.includes('consent_required') ||
      errorMsg.includes('missing_refresh_token') ||
      errorMsg.toLowerCase().includes('timeout');

    if (isLoginRequired) {
      // Fallback C: redirección de primer nivel con prompt=none preservando returnTo
      try {
        await provider.loginRedirect({
          silent: true,
          returnTo: `${pathname}${search}`,
        });
        return; 
      } catch {
        useSession.getState().setStatus('unauthenticated', { profile: null });
        return;
      }
    }

    useSession.getState().setStatus('error', {
      error: {
        title: 'Error de Conexión',
        message: 'No fue posible verificar la sesión con el servidor de autenticación.',
        detail: errorMsg,
      },
    });
    return;
  }

  try {
    const profile = await getMyProfile();
    useSession.getState().setStatus('authenticated', { profile, error: null });
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 404) {
      // Usuario autenticado en Auth0 sin perfil en Discordia: auto-aprovisionar con datos de registro o Auth0
      let authUser: Awaited<ReturnType<AuthProvider['getUser']>>;
      try {
        authUser = await provider.getUser();
        const pendingUsername = typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem('discordia_pending_username')
          : null;
        const pendingDisplayName = typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem('discordia_pending_display_name')
          : null;
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('discordia_pending_username');
          sessionStorage.removeItem('discordia_pending_display_name');
        }

        // Prioridad: username elegido al registrarse (claim del ID token, sobrevive a
        // verificar el mail en otra pestaña/dispositivo) > el guardado en esta pestaña > derivados.
        const rawUsername = authUser?.username || pendingUsername || authUser?.nickname || authUser?.email?.split('@')[0] || `user_${Date.now().toString().slice(-4)}`;
        const cleanUsername = rawUsername.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_').padEnd(3, '0').slice(0, 32);

        // En cuentas usuario/contraseña Auth0 completa `name` con el email: no sirve como nombre visible
        const idpName = authUser?.name && authUser.name !== authUser.email ? authUser.name : undefined;

        const autoProfile = await upsertMyProfile({
          username: cleanUsername,
          display_name: pendingDisplayName || idpName || cleanUsername,
          avatar_url: authUser?.picture,
        });

        useSession.getState().setStatus('authenticated', { profile: autoProfile, error: null });
        return;
      } catch (autoErr: any) {
        // Segunda barrera: el backend rechaza crear el perfil si el email no está
        // verificado (token emitido antes de activar la Action, o Action desactivada).
        if (isProblemType(autoErr, PROBLEM_TYPES.EMAIL_NOT_VERIFIED)) {
          applyAuthDenial('email_not_verified', authUser?.email);
          return;
        }

        // Si hay colisión de username (409), mostrar pantalla para que elija otro
        if (autoErr instanceof ApiError && autoErr.status === 409) {
          useSession.getState().setStatus('needs_profile', { profile: null, error: null });
          return;
        }

        useSession.getState().setStatus('error', {
          error: {
            title: 'Error de Perfil',
            message: 'No se pudo crear automáticamente tu perfil de usuario.',
            detail: autoErr?.detail || autoErr?.message,
          },
        });
        return;
      }
    }

    // Error de backend (500, red, etc.)
    useSession.getState().setStatus('error', {
      error: {
        title: 'Error de Perfil',
        message: 'No se pudo cargar la información de tu perfil de Discordia.',
        detail: err?.detail || err?.message,
      },
    });
  }
}

/**
 * Autenticación directa mediante email y contraseña (sin redirecciones externas).
 */
export async function loginWithCredentials(credentials: { email: string; password: string }): Promise<void> {
  const provider = await resolveProvider();
  if (!provider.loginWithCredentials) {
    throw new Error('El proveedor de autenticación no soporta inicio de sesión con credenciales directas.');
  }

  try {
    await provider.loginWithCredentials(credentials);
  } catch (err) {
    // Email sin verificar no es un error del formulario: es un estado de la sesión
    // con su propia pantalla. Cualquier otro error sigue subiendo al formulario.
    if (classifyAuthDenial(err) === 'email_not_verified') {
      applyAuthDenial('email_not_verified', credentials.email);
      return;
    }
    throw err;
  }
  await retryBootstrap();
}

/**
 * Registro de nueva cuenta directamente con credenciales e ingreso automático a la plataforma.
 */
export async function signupWithCredentials(data: {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}): Promise<void> {
  const provider = await resolveProvider();
  if (!provider.signupWithCredentials) {
    throw new Error('El proveedor de autenticación no soporta registro directo.');
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('discordia_pending_username', data.username);
    if (data.displayName) {
      sessionStorage.setItem('discordia_pending_display_name', data.displayName);
    }
  }

  try {
    await provider.signupWithCredentials(data);
  } catch (err) {
    // El signup en Auth0 ya se completó y el login automático fue rechazado por
    // falta de verificación: el registro fue exitoso, falta confirmar el email.
    if (classifyAuthDenial(err) === 'email_not_verified') {
      applyAuthDenial('email_not_verified', data.email);
      return;
    }
    throw err;
  }
  await retryBootstrap();
}

/**
 * Vuelve al formulario de login desde la pantalla de verificación, conservando
 * pendingEmail para precargar el campo de email.
 */
export function backToLogin() {
  useSession.getState().setStatus('unauthenticated', { profile: null, error: null });
}

export const authService = {
  login: (opts?: { signup?: boolean; returnTo?: string; loginHint?: string }) => activeProvider.loginRedirect(opts),
  loginWithCredentials,
  signupWithCredentials,
  logout,
  backToLogin,
  bootstrap,
  retryBootstrap,
};
