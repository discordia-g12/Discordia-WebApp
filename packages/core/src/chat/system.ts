import type { Message } from '../types';

/**
 * Mensajes del sistema de Chat-Engine ("se unió …"). El texto lo arma la interfaz con el nombre actual de la
 * persona (si se cambia el nombre, el aviso viejo también), así que el mensaje solo dice qué pasó y a quién.
 */

/** Saludar a quien se unió es reaccionar al aviso con este emoji. */
export const WAVE_EMOJI = '👋';

/** El aviso de que alguien se unió al servidor. */
export function isMemberJoin(message: Pick<Message, 'type' | 'system'>): boolean {
  return message.type === 'system' && message.system?.event === 'member_join';
}

/** A quién se refiere el aviso: quien se unió. */
export function systemMessageUserId(message: Pick<Message, 'system' | 'authorId'>): string {
  return message.system?.userId ?? message.authorId;
}

/**
 * Las partes del aviso: `${before}${name}${after}` y, para saludar, `waveLabel` (cada plataforma lo muestra
 * como acción si se puede reaccionar, o como texto si no). Quien se unió ve otro texto y no se saluda.
 */
export function memberJoinText(
  name: string,
  isMe: boolean
): { before: string; name: string; after: string; waveLabel: string | null } {
  return isMe
    ? { before: 'te uniste al servidor. ¡te damos la bienvenida!', name: '', after: '', waveLabel: null }
    : { before: 'se unió ', name, after: ', ', waveLabel: 'saludalo' };
}

/** Ya lo saludó quien mira (reaccionó con 👋). */
export function hasWaved(message: Pick<Message, 'reactions'>, userId: string): boolean {
  return (message.reactions ?? []).some((r) => r.emoji === WAVE_EMOJI && r.users.includes(userId));
}

/** Cuántos lo saludaron. */
export function waveCount(message: Pick<Message, 'reactions'>): number {
  return (message.reactions ?? []).find((r) => r.emoji === WAVE_EMOJI)?.count ?? 0;
}
