/**
 * Errores de autenticación y contratos de error compartidos con Auth0 y el backend.
 * Mismo contrato que usa el cliente web (src/auth/errors.ts y src/api/errors.ts).
 *
 * 1) Auth0 Post Login Action: cuando rechaza un login hace
 *    `api.access.deny(<código>)` y /oauth/token responde
 *      403 { error: 'access_denied', error_description: '<código>' }
 *    Una contraseña incorrecta TAMBIÉN es 403, pero con error 'invalid_grant':
 *    por eso se decide por el campo `error` + código, nunca por status ni texto.
 *
 * 2) Backend (RFC 7807): errores que comparten status se distinguen por `type`.
 */

export const AUTH_DENY_CODES = {
  EMAIL_NOT_VERIFIED: 'email_not_verified',
} as const

export const PROBLEM_TYPES = {
  EMAIL_NOT_VERIFIED: 'https://discordia.app/problems/email-not-verified',
} as const

/** Credenciales correctas, pero el email todavía no fue verificado. */
export class EmailNotVerifiedError extends Error {
  readonly email?: string

  constructor(email?: string) {
    super('Tu email todavía no está verificado.')
    this.name = 'EmailNotVerifiedError'
    this.email = email
  }
}

/** Auth0 denegó el acceso por un motivo distinto a la verificación (cuenta bloqueada/suspendida). */
export class AccountSuspendedError extends Error {
  constructor() {
    super('Tu cuenta se encuentra suspendida.')
    this.name = 'AccountSuspendedError'
  }
}

/**
 * Traduce el body de error de /oauth/token a un error tipado cuando es un
 * rechazo de la Action. Devuelve null en cualquier otro caso (credenciales
 * inválidas, errores de Auth0, etc.), que siguen su manejo habitual.
 */
export function toAuthDenialError(
  body: { error?: unknown; error_description?: unknown } | null | undefined,
  email?: string,
): EmailNotVerifiedError | AccountSuspendedError | null {
  if (body?.error !== 'access_denied') return null
  if (body.error_description === AUTH_DENY_CODES.EMAIL_NOT_VERIFIED) {
    return new EmailNotVerifiedError(email)
  }
  return new AccountSuspendedError()
}

/** true si `err` es un error de apiFetch con el `type` RFC 7807 indicado. */
export function isProblemType(err: unknown, type: string): boolean {
  return typeof err === 'object' && err !== null && (err as { type?: unknown }).type === type
}
