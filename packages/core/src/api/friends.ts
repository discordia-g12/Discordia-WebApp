import { api } from './client';
import { getApiMock } from './mock';
import { mapPublicProfileFromBackend } from './users';
import type {
  FriendRequest,
  FriendRequestBackendResponse,
  FriendRequests,
  PublicProfile,
  PublicProfileBackendResponse,
} from '../types';

/** Largo máximo de la descripción de una solicitud de amistad. */
export const FRIEND_REQUEST_MESSAGE_MAX = 190;

function mapFriendRequestFromBackend(raw: FriendRequestBackendResponse): FriendRequest {
  return {
    id: raw.id,
    user: mapPublicProfileFromBackend(raw.user),
    message: raw.message,
    createdAt: raw.created_at,
  };
}

/** Amigos del usuario autenticado. */
export async function getFriends(): Promise<PublicProfile[]> {
  const mock = getApiMock();
  if (mock?.getFriends) return mock.getFriends();

  const raw = await api.get<PublicProfileBackendResponse[]>('/api/v1/users/me/friends');
  return (raw || []).map(mapPublicProfileFromBackend);
}

export async function removeFriend(userId: string): Promise<void> {
  const mock = getApiMock();
  if (mock?.removeFriend) return mock.removeFriend(userId);

  await api.delete<void>(`/api/v1/users/me/friends/${encodeURIComponent(userId)}`);
}

/** Solicitudes de amistad pendientes, recibidas y enviadas. */
export async function getFriendRequests(): Promise<FriendRequests> {
  const mock = getApiMock();
  if (mock?.getFriendRequests) return mock.getFriendRequests();

  const raw = await api.get<{ incoming: FriendRequestBackendResponse[]; outgoing: FriendRequestBackendResponse[] }>(
    '/api/v1/users/me/friend-requests'
  );
  return {
    incoming: (raw?.incoming || []).map(mapFriendRequestFromBackend),
    outgoing: (raw?.outgoing || []).map(mapFriendRequestFromBackend),
  };
}

/** A quién se le pide amistad: `target` (username o email, desde el formulario) o `userId` (desde el perfil). */
export interface SendFriendRequestPayload {
  target?: string;
  userId?: string;
  message?: string;
}

/**
 * Envía una solicitud de amistad. Devuelve null si el backend responde `202 { status: "sent" }` (fue por
 * email, o hay un bloqueo): la interfaz muestra lo mismo que con una solicitud creada, así nunca confirma
 * si el email existe ni si hay un bloqueo.
 */
export async function sendFriendRequest(payload: SendFriendRequestPayload): Promise<FriendRequest | null> {
  const mock = getApiMock();
  if (mock?.sendFriendRequest) return mock.sendFriendRequest(payload);

  const { target, userId, message } = payload;
  const raw = await api.post<FriendRequestBackendResponse | { status: 'sent' }>('/api/v1/users/me/friend-requests', {
    ...(target ? { target } : {}),
    ...(userId ? { user_id: userId } : {}),
    ...(message ? { message } : {}),
  });
  return 'id' in raw ? mapFriendRequestFromBackend(raw) : null;
}

/** Acepta una solicitud recibida y devuelve el perfil del amigo nuevo. */
export async function acceptFriendRequest(requestId: string): Promise<PublicProfile> {
  const mock = getApiMock();
  if (mock?.acceptFriendRequest) return mock.acceptFriendRequest(requestId);

  const raw = await api.post<{ friend: PublicProfileBackendResponse }>(
    `/api/v1/users/me/friend-requests/${encodeURIComponent(requestId)}/accept`
  );
  return mapPublicProfileFromBackend(raw.friend);
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const mock = getApiMock();
  if (mock?.declineFriendRequest) return mock.declineFriendRequest(requestId);

  await api.post<void>(`/api/v1/users/me/friend-requests/${encodeURIComponent(requestId)}/decline`);
}

/** Cancela una solicitud enviada por el usuario autenticado. */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const mock = getApiMock();
  if (mock?.cancelFriendRequest) return mock.cancelFriendRequest(requestId);

  await api.delete<void>(`/api/v1/users/me/friend-requests/${encodeURIComponent(requestId)}`);
}
