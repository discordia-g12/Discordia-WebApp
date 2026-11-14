import type { CallEndReason } from '../api/calls';
import { ApiError } from '../api/errors';
import { dmErrorCode, DM_PENDING_MESSAGE } from '../dm/errors';
import type { CallRole } from './machine';

/** 409 de POST /calls: el otro (o el usuario, desde otro dispositivo) ya está en una llamada privada. */
export const CALL_BUSY_MESSAGE = 'está en otra llamada';

/**
 * Cómo terminó la llamada, para quien la ve terminar. Quien llama se entera del motivo; quien recibe solo
 * distingue si la perdió. `unavailable` nunca dice si hubo un bloqueo.
 */
export function callEndMessage(reason: CallEndReason, role: CallRole): string {
  if (role === 'caller') {
    switch (reason) {
      case 'declined':
        return 'no puede atender ahora';
      case 'missed':
        return 'no respondió';
      case 'canceled':
        return 'llamada cancelada';
      case 'unavailable':
        return 'no se pudo completar la llamada';
      default:
        return 'llamada finalizada';
    }
  }
  switch (reason) {
    case 'missed':
    case 'canceled':
      return 'llamada perdida';
    case 'declined':
      return 'rechazaste la llamada';
    case 'unavailable':
      return 'no se pudo completar la llamada';
    default:
      return 'llamada finalizada';
  }
}

/**
 * Texto para un error de start o accept. Los rechazos de entrega son los mismos que en el DM (genérico,
 * nunca "te bloquearon").
 */
export function callErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'CALL_BUSY') return CALL_BUSY_MESSAGE;
    if (err.code === 'CALL_NOT_RINGING') return 'la llamada ya terminó';
    const dmCode = dmErrorCode(err);
    if (dmCode === 'DM_PENDING') return DM_PENDING_MESSAGE;
    if (dmCode === 'DM_NOT_DELIVERABLE' || err.status === 403) return 'no se pudo completar la llamada';
  }
  return 'no se pudo conectar la llamada';
}
