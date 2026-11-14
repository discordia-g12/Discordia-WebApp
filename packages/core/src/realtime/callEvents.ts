import type { CallInboxEvent, InboxEvent } from './inboxSocket';

/**
 * Los eventos de llamadas viajan por el socket inbox, pero useInbox no los procesa: los reenvía acá y los
 * toma usePrivateCall. Así hay un solo socket por sesión y el inbox no conoce la máquina de llamadas.
 */
export interface CallEventListener {
  onEvent?: (event: CallInboxEvent) => void;
  /** El inbox volvió después de un corte (o de `enabled` en false): lo que pasó en el medio no llegó. */
  onReconnect?: () => void;
}

const listeners = new Set<CallEventListener>();

export function isCallInboxEvent(event: InboxEvent): event is CallInboxEvent {
  return event.type === 'CALL_RINGING' || event.type === 'CALL_ACCEPTED' || event.type === 'CALL_ENDED';
}

/** Se suscribe a los eventos de llamadas del inbox. Devuelve cómo desuscribirse. */
export function subscribeCallEvents(listener: CallEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Lo llama useInbox con cada CALL_* que llega. */
export function publishCallEvent(event: CallInboxEvent): void {
  listeners.forEach((listener) => listener.onEvent?.(event));
}

/** Lo llama useInbox cuando el socket vuelve a abrir después de haber estado abierto. */
export function publishInboxReconnect(): void {
  listeners.forEach((listener) => listener.onReconnect?.());
}
