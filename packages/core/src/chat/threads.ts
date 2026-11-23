import { formatTimeAgo } from '../admin/platformStatus';
import type { Message, ThreadSummary } from '../types';

/** "1 respuesta", "3 respuestas". */
export function replyCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'respuesta' : 'respuestas'}`;
}

/** Debajo del mensaje original (CA3): "3 respuestas · última hace 5 min". */
export function threadSummaryLabel(thread: ThreadSummary, now: number = Date.now()): string {
  return `${replyCountLabel(thread.replyCount)} · última ${formatTimeAgo(thread.lastReplyAt, now)}`;
}

/** Si el mensaje muestra el resumen del hilo: es un original con al menos una respuesta. */
export function hasThreadReplies(message: Message): message is Message & { thread: ThreadSummary } {
  return !message.threadParentId && (message.thread?.replyCount ?? 0) > 0;
}

/** Si se puede abrir un hilo desde este mensaje: no es una respuesta, ni un aviso del sistema, ni borrado. */
export function canStartThread(message: Message): boolean {
  return !message.threadParentId && message.type !== 'system' && message.type !== 'deleted';
}
