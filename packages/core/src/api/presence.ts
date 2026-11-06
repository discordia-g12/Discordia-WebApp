import { api } from './client';
import { getApiMock } from './mock';

export type PresenceStatus = 'online' | 'offline';

export type PresenceMap = Record<string, PresenceStatus>;

/** Máximo de ids que acepta POST /api/v1/chat/presence por pedido. */
const PRESENCE_LIMIT = 100;

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
