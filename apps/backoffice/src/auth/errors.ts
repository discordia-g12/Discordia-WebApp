/** Los errores del SDK de Auth0 traen el código en `error` y el detalle en `error_description`. */
function field(err: unknown, key: 'error' | 'error_description' | 'message'): string {
  if (err && typeof err === 'object' && key in err) {
    const value = (err as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

export function authErrorCode(err: unknown): string {
  return field(err, 'error');
}

/** Motivo con el que la Action de login rechazó el acceso (api.access.deny), por ejemplo "staff_only". */
export function authErrorDescription(err: unknown): string {
  return field(err, 'error_description');
}

export function authErrorMessage(err: unknown): string {
  return authErrorDescription(err) || field(err, 'message') || 'Error desconocido';
}

// Sin sesión en Auth0, o vencida: hay que entrar de nuevo. No es un error
const SIGNED_OUT_CODES = new Set(['login_required', 'consent_required', 'interaction_required', 'missing_refresh_token']);

export function isSignedOutError(err: unknown): boolean {
  return SIGNED_OUT_CODES.has(authErrorCode(err));
}

/** La Action de login rechazó el acceso: la cuenta no es staff o no verificó el email. */
export function isAccessDenied(err: unknown): boolean {
  return authErrorCode(err) === 'access_denied';
}
