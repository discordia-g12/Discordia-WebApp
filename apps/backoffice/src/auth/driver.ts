/** Quien entra al backoffice, según Auth0. */
export interface StaffUser {
  name: string;
  email: string;
  picture?: string;
}

/** Resultado de validar el segundo factor. */
export interface TwoFactorVerification {
  valid: boolean;
  /** Se usó un código de recuperación (conviene regenerar la lista). */
  recoveryCodeUsed: boolean;
}

/**
 * Cómo se obtiene la sesión: Auth0 (auth0.ts) o el mock de desarrollo (mock.ts). La sesión (session.ts)
 * decide con el token qué se muestra.
 */
export interface AuthDriver {
  /**
   * Arranque: procesa la vuelta de Google (/callback) y pide un token con la sesión de Auth0 que haya.
   * Devuelve null si no hay sesión. Lanza los rechazos de la Action de login (access_denied).
   */
  start(): Promise<string | null>;
  getToken(opts?: { forceRefresh?: boolean }): Promise<string>;
  getUser(): Promise<StaffUser>;
  /**
   * Email y contraseña en el formulario propio (ADR-03). Devuelve el access token.
   *
   * @throws StaffOnlyError si la cuenta no es staff, EmailNotVerifiedError, AuthNetworkError o un Error con
   *   el mensaje genérico de credenciales incorrectas
   */
  loginWithPassword(credentials: { email: string; password: string }): Promise<string>;
  /** 'redirected': el navegador se va a Google (por Auth0). 'done': ya hay sesión (mock). */
  loginWithGoogle(): Promise<'redirected' | 'done'>;
  /** Manda el mail para elegir una contraseña nueva (el mismo endpoint de la web). */
  requestPasswordReset(email: string): Promise<void>;
  /** Si la cuenta tiene la 2FA activa (Auth-User-Service, la misma de la web). */
  isTwoFactorEnabled(token: string): Promise<boolean>;
  verifyTwoFactor(code: string, token: string): Promise<TwoFactorVerification>;
  /** Cierra la sesión también en Auth0, así se puede entrar con otra cuenta. */
  logout(): Promise<'redirected' | 'done'>;
}
