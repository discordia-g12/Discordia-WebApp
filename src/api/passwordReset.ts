import { api } from './client';

/**
 * Pide el email de recupero de contraseña (POST /api/v1/auth/password-reset, público).
 *
 * El backend responde 202 con el mismo mensaje exista o no la cuenta. Errores posibles (ApiError):
 *  - 422: formato de email inválido.
 *  - 429: límite por email (type PASSWORD_RESET_THROTTLED, del servicio) o por IP (Kong). Trae
 *         retryAfterSeconds cuando el header Retry-After está disponible.
 *  - 503: Auth0 no disponible.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    return;
  }
  await api.post('/api/v1/auth/password-reset', { email: email.trim() }, { skipAuth: true });
}
