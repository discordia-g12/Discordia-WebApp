/**
 * Contrato del adaptador de autenticación de cada plataforma (web: Auth0 SPA; mobile: token en memoria).
 * La máquina de estados de la sesión (auth/session.ts) es la misma para las dos; lo que cambia es cómo
 * se obtiene y se guarda el token, y qué hacer cuando no hay sesión (la web puede redirigir a Auth0).
 */

export interface AuthUser {
  sub?: string;
  email?: string;
  nickname?: string;
  name?: string;
  picture?: string;
  /**
   * Username elegido al registrarse (claim https://discordia.app/username del
   * ID token, lo agrega la Auth0 Action desde user_metadata). Es una
   * sugerencia para crear el perfil: el backend vuelve a validarlo.
   */
  username?: string;
}

/** Datos elegidos al registrarse, guardados hasta crear el perfil en Discordia. */
export interface PendingProfile {
  username?: string;
  displayName?: string;
}

export interface PendingProfileStore {
  save(profile: PendingProfile): void;
  /** Devuelve lo guardado y lo borra. */
  take(): PendingProfile;
}

/** Qué hizo el adaptador cuando no hay sesión válida. */
export type SessionRecovery = 'unauthenticated' | 'redirected' | 'error';

export interface AuthAdapter {
  /**
   * Obtiene un token de acceso válido.
   * Si forceRefresh es true, fuerza la renovación ignorando el caché.
   */
  getToken(opts?: { forceRefresh?: boolean }): Promise<string>;

  /** Datos de perfil básicos provistos por el IdP (email, nickname, picture). */
  getUser(): Promise<AuthUser | undefined>;

  /** Inicia sesión con email y contraseña (flujo integrado sin redirección externa). */
  loginWithCredentials(credentials: { email: string; password: string }): Promise<void>;

  /** Registra una cuenta nueva en el IdP y autentica al usuario. */
  signupWithCredentials(data: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
  }): Promise<void>;

  /** Cierra la sesión en la aplicación y en el proveedor de identidad. */
  logout(): Promise<void>;

  /** Guarda la sesión de un usuario que acaba de completar la verificación 2FA (CA 2, CA 4). */
  completeTwoFactorSession?(token: string, user: AuthUser, expiresInSeconds?: number): Promise<void>;

  /**
   * Primer paso del arranque, antes de pedir el token (web: procesar el /callback de Universal Login).
   * Si lanza, el arranque lo trata como rechazo del IdP o como sesión inexistente.
   */
  completeRedirect?(): Promise<void>;

  /**
   * Al arrancar no hubo token (y no fue un rechazo del IdP). Default: 'unauthenticated'.
   * La web puede intentar una redirección silenciosa a Auth0 ('redirected') o informar un error.
   */
  onMissingSession?(err: unknown): Promise<SessionRecovery>;

  /** Un 401 no se pudo renovar en plena sesión. Default: 'unauthenticated'. */
  onSessionLost?(): Promise<Exclude<SessionRecovery, 'error'>>;

  /** Dónde guardar el username elegido al registrarse hasta crear el perfil. Default: en memoria. */
  pendingProfile?: PendingProfileStore;
}
