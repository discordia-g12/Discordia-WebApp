import type { Status } from '../types';
import { api } from './client';
import { getApiMock } from './mock';

/** Lo que Chat-Engine muestra de otro usuario. Un usuario invisible figura `offline`. */
export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'offline';

/** Lo que elige el propio usuario. Chat-Engine lo guarda entre sesiones. */
export type PreferredStatus = 'online' | 'idle' | 'dnd' | 'invisible';

export type PresenceMap = Record<string, PresenceStatus>;

/** Máximo de ids que acepta POST /api/v1/chat/presence por pedido. */
const PRESENCE_LIMIT = 100;

/** Estado de la interfaz → el que se guarda (la interfaz llama `offline` a lo que el backend llama `invisible`). */
export function toPreferredStatus(status: Status): PreferredStatus {
  return status === 'offline' ? 'invisible' : status;
}

/** Presencia de los usuarios indicados (en lotes de PRESENCE_LIMIT). */
export async function getPresence(userIds: string[]): Promise<PresenceMap> {
  const uniqueIds = Array.from(new Set(userIds));
  if (!uniqueIds.length) return {};

  const mock = getApiMock();
  if (mock?.getPresence) return mock.getPresence(uniqueIds);

  const batches: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += PRESENCE_LIMIT) {
    batches.push(uniqueIds.slice(i, i + PRESENCE_LIMIT));
  }
  const responses = await Promise.all(
    batches.map((batch) => api.post<PresenceMap>('/api/v1/chat/presence', { userIds: batch }))
  );
  return Object.assign({}, ...responses);
}

/** Estado elegido por el usuario (`online` si nunca eligió uno). */
export async function getMyStatus(): Promise<PreferredStatus> {
  const mock = getApiMock();
  if (mock?.getMyStatus) return mock.getMyStatus();

  return (await api.get<{ status: PreferredStatus }>('/api/v1/chat/presence/me')).status;
}

/** Guarda el estado elegido. Los demás lo ven en el próximo pedido de presencia. */
export async function setMyStatus(status: PreferredStatus): Promise<PreferredStatus> {
  const mock = getApiMock();
  if (mock?.setMyStatus) return mock.setMyStatus(status);

  return (await api.put<{ status: PreferredStatus }>('/api/v1/chat/presence/me', { status })).status;
}
