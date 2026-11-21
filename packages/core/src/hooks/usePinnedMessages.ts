import { useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getPinnedMessages, setMessagePinned } from '../api/messages';
import { ApiError } from '../api/errors';
import { PINNED_LIMIT } from '../chat/pins';
import { useSession } from '../auth/session';
import type { Message } from '../types';
import { mergeCachedMessage, pinnedMessagesQueryKey, syncPinnedMessage, updateCachedMessages } from './messageCache';

/**
 * Fijados de un canal o DM. Se pide aparte del historial porque un fijado puede ser más viejo que las páginas
 * cargadas. El socket y las acciones la mantienen al día con mergeCachedMessage.
 */
export function usePinnedMessagesQuery(channelId: string | null, options: { enabled?: boolean } = {}) {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: pinnedMessagesQueryKey(channelId),
    queryFn: () => getPinnedMessages(channelId as string),
    enabled: status === 'authenticated' && Boolean(channelId) && (options.enabled ?? true),
  });
}

/** Solo los campos de fijado: lo que cambia al fijar o desfijar. */
export type PinState = Pick<Message, 'isPinned' | 'pinnedAt' | 'pinnedBy'>;

function pinStateOf(message: Message): PinState {
  return { isPinned: message.isPinned ?? false, pinnedAt: message.pinnedAt ?? null, pinnedBy: message.pinnedBy ?? null };
}

/** No se pudo fijar o desfijar: `message` es el texto para mostrar y `cause`, el error de la API. */
export class PinMessageError extends Error {
  readonly cause: unknown;

  constructor(message: string, options: { cause: unknown }) {
    super(message);
    this.name = 'PinMessageError';
    this.cause = options.cause;
  }
}

/** Texto para mostrar cuando no se pudo fijar o desfijar. */
export function pinErrorMessage(err: unknown, pinned: boolean): string {
  if (err instanceof ApiError && err.status === 409) return `Ya hay ${PINNED_LIMIT} mensajes fijados. Desfijá alguno primero.`;
  if (err instanceof ApiError && err.status === 403) return 'No tenés permiso para fijar mensajes acá.';
  return pinned ? 'No se pudo fijar el mensaje' : 'No se pudo desfijar el mensaje';
}

export interface PinMessageOptions {
  /** true fija, false desfija. Por defecto, lo contrario de lo que está. */
  pinned?: boolean;
  /**
   * Para quien guarda los mensajes fuera de React Query (los canales de mobile): se llama con el estado
   * optimista, con el confirmado por el servidor y con el anterior si falla.
   */
  onPinStateChange?: (messageId: string, state: PinState) => void;
}

/**
 * Fija o desfija un mensaje con actualización optimista del historial y de los fijados. Si el servidor lo
 * rechaza vuelve al estado anterior y relanza un PinMessageError con un texto para mostrar (ver pinErrorMessage).
 * Web la usa con usePinMessage; mobile, desde su DataProvider.
 */
export async function togglePinnedMessage(
  queryClient: QueryClient,
  channelId: string,
  message: Message,
  { pinned = !message.isPinned, onPinStateChange }: PinMessageOptions = {}
): Promise<void> {
  // Solo se tocan los campos de fijado: el resto del mensaje que tiene el caché puede ser más nuevo
  const apply = (state: PinState) => {
    updateCachedMessages(queryClient, channelId, (list) =>
      list.map((m) => (m.id === message.id ? { ...m, ...state } : m))
    );
    syncPinnedMessage(queryClient, channelId, { ...message, ...state });
    onPinStateChange?.(message.id, state);
  };

  const previous = pinStateOf(message);
  apply({ isPinned: pinned, pinnedAt: pinned ? new Date().toISOString() : null, pinnedBy: null });

  try {
    const updated = await setMessagePinned(channelId, message.id, pinned);
    mergeCachedMessage(queryClient, channelId, updated);
    onPinStateChange?.(message.id, pinStateOf(updated));
  } catch (err) {
    apply(previous);
    throw new PinMessageError(pinErrorMessage(err, pinned), { cause: err });
  }
}

/** togglePinnedMessage atado a un canal o DM. Sin canal no hace nada. */
export function usePinMessage(channelId: string | null, options: Pick<PinMessageOptions, 'onPinStateChange'> = {}) {
  const queryClient = useQueryClient();
  const { onPinStateChange } = options;
  return useCallback(
    async (message: Message, pinned?: boolean) => {
      if (!channelId) return;
      await togglePinnedMessage(queryClient, channelId, message, { pinned, onPinStateChange });
    },
    [channelId, queryClient, onPinStateChange]
  );
}
