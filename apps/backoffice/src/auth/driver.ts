/** Quien entra al backoffice, según Auth0. */
export interface StaffUser {
  name: string;
  email: string;
  picture?: string;
}

/**
 * Cómo se obtiene la sesión: Auth0 (auth0.ts) o el mock de desarrollo (mock.ts). La sesión (session.ts)
 * decide con el token qué se muestra.
 */
export interface AuthDriver {
  /**
   * Arranque: procesa la vuelta del login (/callback) y pide un token con la sesión de Auth0 que haya.
   * Devuelve null si no hay sesión. Lanza los rechazos de la Action de login (access_denied).
   */
  start(): Promise<string | null>;
  getToken(opts?: { forceRefresh?: boolean }): Promise<string>;
  getUser(): Promise<StaffUser>;
  /** 'redirected': el navegador se va a Auth0. 'done': ya hay sesión (mock). */
  login(): Promise<'redirected' | 'done'>;
  /** Cierra la sesión también en Auth0, así se puede entrar con otra cuenta. */
  logout(): Promise<'redirected' | 'done'>;
}
