import { create } from 'zustand';
import type { AuthAdapter, AuthUser, PendingProfile, PendingProfileStore } from './adapter';
import { configureClient } from '../api/client';
import { ApiError, errorDetail, isProblemType, PROBLEM_TYPES } from '../api/errors';
import { getMyProfile, upsertMyProfile, UserProfile } from '../api/users';
import { AuthDenial, classifyAuthDenial } from './errors';
import { roleFromAccessToken } from './auth0';

/**
 * Sesión de Discordia: máquina de estados compartida por web y mobile. Cada plataforma registra su
 * adaptador (setAuthAdapter / setAuthAdapterResolver) y la UI lee el estado con useSession.
 */

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
  pendingTwoFactor: { token: string; user: AuthUser; expiresIn?: number } | null;
  /** Rol de plataforma del usuario autenticado (claim del access token, ver auth/roles.ts); null fuera de la sesión. */
  role: string | null;
  setStatus: (status: SessionStatus, extra?: Partial<SessionState>) => void;
}

export const useSession = create<SessionState>((set) => ({
  status: 'bootstrapping',
  profile: null,
  error: null,
  isMock: false,
  pendingEmail: null,
  pendingTwoFactor: null,
  role: null,
  // El rol vale solo con sesión: cualquier otro estado lo borra (salvo que se pase en extra)
  setStatus: (status, extra = {}) =>
    set((state) => ({
      ...state,
      role: status === 'authenticated' ? state.role : null,
      pendingTwoFactor: status === 'authenticated' ? null : (extra.pendingTwoFactor !== undefined ? extra.pendingTwoFactor : state.pendingTwoFactor),
      status,
      ...extra,
    })),
}));

// Adaptador de autenticación activo y, opcionalmente, cómo resolverlo en cada arranque
// (la web elige entre Auth0 y el mock de desarrollo)
let activeAdapter: AuthAdapter | null = null;
let adapterResolver: (() => Promise<AuthAdapter>) | null = null;

/** Fija el adaptador (mobile, tests). Descarta un resolver registrado antes. */
export function setAuthAdapter(adapter: AuthAdapter) {
  activeAdapter = adapter;
  adapterResolver = null;
}

/** Resuelve el adaptador al comienzo de cada arranque (la web: Auth0 o el mock de desarrollo). */
export function setAuthAdapterResolver(resolver: () => Promise<AuthAdapter>) {
  adapterResolver = resolver;
}

export function getAuthAdapter(): AuthAdapter {
  if (!activeAdapter) {
    throw new Error('Sin adaptador de autenticación: llamar a setAuthAdapter() al arrancar la app.');
  }
  return activeAdapter;
}

async function resolveAdapter(): Promise<AuthAdapter> {
  if (adapterResolver) {
    activeAdapter = await adapterResolver();
  }
  return getAuthAdapter();
}

// Callback opcional para limpiar el caché de react-query al cerrar sesión
let onClearQueryCache: (() => void) | null = null;
export function registerQueryCacheCleaner(fn: () => void) {
  onClearQueryCache = fn;
}

// Datos del registro guardados hasta crear el perfil, si el adaptador no trae su propio almacenamiento
let memoryPendingProfile: PendingProfile = {};
const memoryPendingProfileStore: PendingProfileStore = {
  save: (profile) => {
    memoryPendingProfile = profile;
  },
  take: () => {
    const profile = memoryPendingProfile;
    memoryPendingProfile = {};
    return profile;
  },
};

function pendingProfileStore(adapter: AuthAdapter): PendingProfileStore {
  return adapter.pendingProfile ?? memoryPendingProfileStore;
}

// Configurar el cliente HTTP desacoplado
configureClient({
  getToken: (opts) => {
    if (!activeAdapter) return Promise.reject(new Error('login_required'));
    return activeAdapter.getToken(opts);
  },
  onAuthFailure: () => handleAuthFailure(),
});

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
  if (useSession.getState().isMock) {
    return;
  }

  if (onClearQueryCache) {
    onClearQueryCache();
  }

  let recovery: 'unauthenticated' | 'redirected' = 'unauthenticated';
  if (activeAdapter?.onSessionLost) {
    try {
      recovery = await activeAdapter.onSessionLost();
    } catch {
      recovery = 'unauthenticated';
    }
  }
  if (recovery === 'unauthenticated') {
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
  await activeAdapter?.logout();
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

  const adapter = await resolveAdapter();

  if (adapter.completeRedirect) {
    try {
      await adapter.completeRedirect();
    } catch (err) {
      const denial = classifyAuthDenial(err);
      if (denial) {
        applyAuthDenial(denial);
        return;
      }

      // CA 3: Proveedor externo no disponible - el sistema informa el error y ofrece email/contraseña
      useSession.getState().setStatus('unauthenticated', {
        profile: null,
        error: {
          title: 'Proveedor no disponible',
          message: 'El proveedor externo no está disponible o no respondió. Podés iniciar sesión con correo y contraseña.',
        },
      });
      return;
    }
  }

  // El rol sale del mismo access token que valida Kong: la interfaz muestra lo que el Gateway va a permitir
  let role: string;
  try {
    role = roleFromAccessToken(await adapter.getToken());
  } catch (err) {
    const denial = classifyAuthDenial(err);
    if (denial) {
      applyAuthDenial(denial);
      return;
    }

    let recovery: 'unauthenticated' | 'redirected' | 'error' = 'unauthenticated';
    if (adapter.onMissingSession) {
      try {
        recovery = await adapter.onMissingSession(err);
      } catch {
        recovery = 'unauthenticated';
      }
    }

    if (recovery === 'redirected') return;
    if (recovery === 'unauthenticated') {
      useSession.getState().setStatus('unauthenticated', { profile: null });
      return;
    }

    useSession.getState().setStatus('error', {
      error: {
        title: 'Error de Conexión',
        message: 'No fue posible verificar la sesión con el servidor de autenticación.',
        // Los errores del SDK de Auth0 traen el código en `error` (login_required, consent_required...)
        detail: errorDetail(err) || (typeof err === 'object' && err !== null && 'error' in err ? String(err.error) : ''),
      },
    });
    return;
  }

  try {
    const profile = await getMyProfile();
    useSession.getState().setStatus('authenticated', { profile, error: null, role });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // Usuario autenticado en Auth0 sin perfil en Discordia: auto-aprovisionar con datos de registro o Auth0
      let authUser: Awaited<ReturnType<AuthAdapter['getUser']>>;
      try {
        authUser = await adapter.getUser();
        const pending = pendingProfileStore(adapter).take();

        // Prioridad: username elegido al registrarse (claim del ID token, sobrevive a
        // verificar el mail en otra pestaña/dispositivo) > el guardado localmente.
        // Si no eligió un username (ej. primer ingreso con proveedor federado como Google),
        // se muestra la pantalla "ELEGÍ TU USUARIO" para que elija su username y nombre visible.
        const chosenUsername = authUser?.username || pending.username;
        if (!chosenUsername) {
          useSession.getState().setStatus('needs_profile', { profile: null, error: null });
          return;
        }

        const cleanUsername = chosenUsername.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_').padEnd(3, '0').slice(0, 32);

        const autoProfile = await upsertMyProfile({
          username: cleanUsername,
          display_name: pending.displayName || cleanUsername,
          avatar_url: authUser?.picture,
        });

        useSession.getState().setStatus('authenticated', { profile: autoProfile, error: null, role });
        return;
      } catch (autoErr) {
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
            detail: errorDetail(autoErr),
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
        detail: errorDetail(err),
      },
    });
  }
}

/**
 * Autenticación directa mediante email y contraseña (sin redirecciones externas).
 */
export async function loginWithCredentials(credentials: { email: string; password: string }): Promise<void> {
  const adapter = await resolveAdapter();

  try {
    await adapter.loginWithCredentials(credentials);
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
 * Completa la sesión una vez validado el segundo factor (CA 2, CA 4).
 */
export async function completeTwoFactorSession(
  token: string,
  user: AuthUser,
  expiresInSeconds?: number
): Promise<void> {
  const adapter = await resolveAdapter();
  if (adapter.completeTwoFactorSession) {
    await adapter.completeTwoFactorSession(token, user, expiresInSeconds);
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
  const adapter = await resolveAdapter();

  pendingProfileStore(adapter).save({ username: data.username, displayName: data.displayName });

  try {
    await adapter.signupWithCredentials(data);
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

/** Actualiza el perfil propio en la sesión (p. ej. después de editarlo). */
export function setSessionProfile(profile: UserProfile) {
  useSession.setState({ profile });
}
