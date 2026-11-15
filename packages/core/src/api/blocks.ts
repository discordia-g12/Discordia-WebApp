import { api } from './client';
import { getApiMock } from './mock';
import { mapPublicProfileFromBackend } from './users';
import type { PublicProfile, PublicProfileBackendResponse } from '../types';

/** Usuarios bloqueados por el usuario autenticado. */
export async function getBlocks(): Promise<PublicProfile[]> {
  const mock = getApiMock();
  if (mock?.getBlocks) return mock.getBlocks();

  const raw = await api.get<PublicProfileBackendResponse[]>('/api/v1/users/me/blocks');
  return (raw || []).map(mapPublicProfileFromBackend);
}

/** Bloquea a un usuario. Idempotente. También borra la amistad y las solicitudes de amistad entre ambos. */
export async function blockUser(userId: string): Promise<void> {
  const mock = getApiMock();
  if (mock?.blockUser) return mock.blockUser(userId);

  await api.put<void>(`/api/v1/users/me/blocks/${encodeURIComponent(userId)}`);
}

/** Desbloquea a un usuario. Idempotente. */
export async function unblockUser(userId: string): Promise<void> {
  const mock = getApiMock();
  if (mock?.unblockUser) return mock.unblockUser(userId);

  await api.delete<void>(`/api/v1/users/me/blocks/${encodeURIComponent(userId)}`);
}
