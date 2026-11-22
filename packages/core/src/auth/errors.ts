/**
 * Errores de autenticación del lado del IdP (Auth0) y su clasificación.
 *
 * Contrato con la Auth0 Post Login Action: cuando la Action rechaza un login
 * hace `api.access.deny(<código>)`. Auth0 lo devuelve como
 *   { error: 'access_denied', error_description: '<código>' }
 * tanto en el body de /oauth/token (grant password-realm) como en el redirect
 * al callback (Universal Login, que auth0-spa-js expone en GenericError).
 *
 * `access_denied` solo no alcanza: Auth0 también lo usa para usuarios
 * bloqueados. Por eso se decide siempre por el código de `error_description`,
 * nunca por el texto del mensaje.
 */

export const AUTH_DENY_CODES = {
  EMAIL_NOT_VERIFIED: 'email_not_verified',
  /** La Action rechaza a quien no es staff cuando entra desde la aplicación del backoffice. */
  STAFF_ONLY: 'staff_only',
} as const;

/** El usuario ingresó credenciales correctas pero todavía no verificó su email. */
export class EmailNotVerifiedError extends Error {
  readonly email?: string;

  constructor(email?: string) {
    super('Tu email todavía no está verificado.');
    this.name = 'EmailNotVerifiedError';
    this.email = email;
  }
}

/** Auth0 denegó el acceso por un motivo distinto a la verificación (cuenta bloqueada/suspendida). */
export class AccountSuspendedError extends Error {
  constructor() {
    super('Tu cuenta se encuentra suspendida.');
    this.name = 'AccountSuspendedError';
  }
}

/**
 * La cuenta no es staff y quiso entrar al backoffice (la Action responde `staff_only`). Solo lo recibe el
 * backoffice: la aplicación de Auth0 de la web no tiene esa regla.
 */
export class StaffOnlyError extends Error {
  constructor() {
    super('Esta cuenta no es staff de la plataforma.');
    this.name = 'StaffOnlyError';
  }
}

/** La cuenta tiene 2FA activo: se requiere el código TOTP o de recuperación antes de otorgar la sesión (CA 2). */
export class TwoFactorRequiredError extends Error {
  readonly pendingToken: string;
  readonly pendingUser: unknown;
  readonly pendingExpiresIn: number;

  constructor(pendingToken: string, pendingUser: unknown, pendingExpiresIn: number = 86400) {
    super('two_factor_required');
    this.name = 'TwoFactorRequiredError';
    this.pendingToken = pendingToken;
    this.pendingUser = pendingUser;
    this.pendingExpiresIn = pendingExpiresIn;
  }
}

/**
 * Auth0 rechazó el registro porque el email o el username ya existen (/dbconnections/signup).
 * `field` dice cuál: Auth0 responde `user_exists` para el email y `username_exists` para el
 * username. `invalid_signup` no distingue, así que queda en null y el mensaje nombra los dos.
 */
export class SignupConflictError extends Error {
  readonly field: 'email' | 'username' | null;

  constructor(field: 'email' | 'username' | null) {
    super(
      field === 'email'
        ? 'Ya existe una cuenta con ese correo. Iniciá sesión.'
        : field === 'username'
          ? 'Ese nombre de usuario ya está tomado. Elegí otro.'
          : 'El correo o nombre de usuario ya está en uso.'
    );
    this.name = 'SignupConflictError';
    this.field = field;
  }
}

/**
 * No se pudo hablar con Auth0: sin conexión o el navegador bloqueó la respuesta por CORS (pasa cuando el
 * origen de la app no está en "Allowed Web Origins" de la aplicación de Auth0). fetch lo reporta como
 * TypeError ("Failed to fetch"), sin status ni body, así que no se puede confundir con credenciales malas.
 */
export class AuthNetworkError extends Error {
  constructor() {
    super('No se pudo conectar con el servidor de autenticación. Revisá tu conexión e intentá de nuevo.');
    this.name = 'AuthNetworkError';
  }
}

export type AuthDenial = 'email_not_verified' | 'suspended';

/**
 * Clasifica un error de autenticación. Devuelve null si no es un rechazo del
 * IdP (credenciales inválidas, red, login_required, etc.).
 *
 * Acepta:
 *  - los errores tipados de este módulo;
 *  - objetos con { error, error_description } (GenericError de auth0-spa-js o
 *    el body de /oauth/token);
 *  - Error planos cuyo message contiene 'access_denied' (compatibilidad con
 *    el formato "access_denied: <detalle>").
 */
export function classifyAuthDenial(err: unknown): AuthDenial | null {
  if (err instanceof EmailNotVerifiedError) return 'email_not_verified';
  if (err instanceof AccountSuspendedError) return 'suspended';

  const e = (err ?? {}) as { error?: unknown; error_description?: unknown; message?: unknown };
  const code = typeof e.error === 'string' ? e.error : '';
  const description = typeof e.error_description === 'string' ? e.error_description : '';
  const message = typeof e.message === 'string' ? e.message : '';

  if (code === 'access_denied') {
    return description === AUTH_DENY_CODES.EMAIL_NOT_VERIFIED ? 'email_not_verified' : 'suspended';
  }

  if (message.includes('access_denied')) {
    return message.includes(AUTH_DENY_CODES.EMAIL_NOT_VERIFIED) ? 'email_not_verified' : 'suspended';
  }

  return null;
}

/**
 * Traduce el body de error de /oauth/token a un error tipado cuando es un rechazo de la Action.
 * Devuelve null en cualquier otro caso (credenciales inválidas, errores de Auth0), que siguen su
 * manejo habitual.
 */
export function toAuthDenialError(
  body: { error?: unknown; error_description?: unknown } | null | undefined,
  email?: string
): EmailNotVerifiedError | StaffOnlyError | AccountSuspendedError | null {
  if (body?.error !== 'access_denied') return null;
  if (body.error_description === AUTH_DENY_CODES.EMAIL_NOT_VERIFIED) return new EmailNotVerifiedError(email);
  if (body.error_description === AUTH_DENY_CODES.STAFF_ONLY) return new StaffOnlyError();
  return new AccountSuspendedError();
}
