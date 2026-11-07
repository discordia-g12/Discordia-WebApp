import { ApiError } from '../api/errors';
import { DM_COMPOSER_MESSAGES } from './actions';

export type DmErrorCode = 'DM_PENDING' | 'DM_NOT_DELIVERABLE';

/** Lo que dice la interfaz si Chat-Engine rechaza un mensaje porque la solicitud sigue sin aceptar. */
export const DM_PENDING_MESSAGE = 'Todavía no aceptaron tu mensaje.';

/**
 * El código de un error de envío. El WebSocket solo manda un texto, y por REST puede venir en `code` o en
 * los campos de Problem Details: se busca en todos.
 */
export function dmErrorCode(err: unknown): DmErrorCode | undefined {
  const text =
    err instanceof ApiError ? [err.code, err.type, err.title, err.detail].join(' ') : typeof err === 'string' ? err : '';
  if (text.includes('DM_PENDING')) return 'DM_PENDING';
  if (text.includes('DM_NOT_DELIVERABLE')) return 'DM_NOT_DELIVERABLE';
  return undefined;
}

/**
 * Texto para un mensaje que no se pudo enviar, por REST (ApiError) o por WebSocket (texto de onError).
 * Cualquier otro rechazo es el mismo error genérico: nunca dice que hay un bloqueo.
 */
export function dmSendErrorMessage(err: unknown): string {
  return dmErrorCode(err) === 'DM_PENDING' ? DM_PENDING_MESSAGE : DM_COMPOSER_MESSAGES.undeliverable;
}
