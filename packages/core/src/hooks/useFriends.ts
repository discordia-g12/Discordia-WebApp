import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/session';
import { blockUser, getBlocks, unblockUser } from '../api/blocks';
import { getConversationWith } from '../api/conversations';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  sendFriendRequest,
  type SendFriendRequestPayload,
} from '../api/friends';
import { getMutualServers } from '../api/servers';
import { getPublicProfile, isProfileUnavailable } from '../api/users';
import { conversationsQueryKey } from './inboxCache';

/**
 * Cada cuánto se vuelven a pedir amigos y solicitudes: Auth no avisa en tiempo real. Es lo que hace que quien
 * mandó una solicitud vea que se la aceptaron.
 */
export const FRIEND_REQUESTS_POLL_MS = 30_000;

export const friendsQueryKey = ['friends'] as const;
export const friendRequestsQueryKey = ['friend-requests'] as const;
export const blocksQueryKey = ['blocks'] as const;

export function publicProfileQueryKey(userId: string | null) {
  return ['public-profile', userId] as const;
}

export function mutualServersQueryKey(userId: string | null) {
  return ['mutual-servers', userId] as const;
}

export function useFriendsQuery() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: friendsQueryKey,
    queryFn: getFriends,
    enabled: status === 'authenticated',
    refetchInterval: FRIEND_REQUESTS_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

/** Solicitudes pendientes. Se piden cada FRIEND_REQUESTS_POLL_MS y al volver a la app, como useUnreadQuery. */
export function useFriendRequestsQuery() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: friendRequestsQueryKey,
    queryFn: getFriendRequests,
    enabled: status === 'authenticated',
    refetchInterval: FRIEND_REQUESTS_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useBlocksQuery() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: blocksQueryKey,
    queryFn: getBlocks,
    enabled: status === 'authenticated',
  });
}

/** Perfil público. Un 404 es "perfil no disponible" (isProfileUnavailable): no se reintenta. */
export function usePublicProfileQuery(userId: string | null) {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: publicProfileQueryKey(userId),
    queryFn: () => getPublicProfile(userId as string),
    enabled: status === 'authenticated' && Boolean(userId),
    retry: (failureCount, error) => !isProfileUnavailable(error) && failureCount < 2,
  });
}

export function useMutualServersQuery(userId: string | null) {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: mutualServersQueryKey(userId),
    queryFn: () => getMutualServers(userId as string),
    enabled: status === 'authenticated' && Boolean(userId),
  });
}

/** Todo lo que puede cambiar cuando cambia la relación con un usuario. */
function useInvalidateRelationship() {
  const queryClient = useQueryClient();
  return (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: friendsQueryKey });
    queryClient.invalidateQueries({ queryKey: friendRequestsQueryKey });
    queryClient.invalidateQueries({ queryKey: blocksQueryKey });
    queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    queryClient.invalidateQueries({ queryKey: userId ? publicProfileQueryKey(userId) : ['public-profile'] });
  };
}

/** Al quedar amigos, la conversación pendiente o rechazada pasa a `accepted`. Si falla, pasa al abrir el chat. */
async function syncConversationWith(userId: string): Promise<void> {
  try {
    await getConversationWith(userId);
  } catch (err) {
    console.error('[DM] No se pudo actualizar la conversación:', err);
  }
}

/**
 * Pide amistad por username o email (`target`) o por `userId`. Resuelve en null si fue un 202: la interfaz
 * muestra lo mismo que con una solicitud creada.
 */
export function useSendFriendRequestMutation() {
  const invalidate = useInvalidateRelationship();
  return useMutation({
    mutationFn: async (payload: SendFriendRequestPayload) => {
      const request = await sendFriendRequest(payload);
      // Había una solicitud inversa pendiente: se aceptaron las dos
      if (request?.user.relationship === 'friend') await syncConversationWith(request.user.id);
      return request;
    },
    onSuccess: (request, { userId }) => invalidate(request?.user.id ?? userId),
  });
}

/** Acepta una solicitud y deja la conversación entre ambos en `accepted`. Resuelve en el perfil del amigo. */
export function useAcceptFriendRequestMutation() {
  const invalidate = useInvalidateRelationship();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const friend = await acceptFriendRequest(requestId);
      await syncConversationWith(friend.id);
      return friend;
    },
    onSuccess: (friend) => invalidate(friend.id),
  });
}

export function useDeclineFriendRequestMutation() {
  const invalidate = useInvalidateRelationship();
  return useMutation({
    mutationFn: ({ requestId }: { requestId: string; userId?: string }) => declineFriendRequest(requestId),
    onSuccess: (_data, { userId }) => invalidate(userId),
  });
}

export function useCancelFriendRequestMutation() {
  const invalidate = useInvalidateRelationship();
  return useMutation({
    mutationFn: ({ requestId }: { requestId: string; userId?: string }) => cancelFriendRequest(requestId),
    onSuccess: (_data, { userId }) => invalidate(userId),
  });
}

export function useRemoveFriendMutation() {
  const invalidate = useInvalidateRelationship();
  return useMutation({
    mutationFn: (userId: string) => removeFriend(userId),
    onSuccess: (_data, userId) => invalidate(userId),
  });
}

export function useBlockUserMutation() {
  const invalidate = useInvalidateRelationship();
  return useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: (_data, userId) => invalidate(userId),
  });
}

export function useUnblockUserMutation() {
  const invalidate = useInvalidateRelationship();
  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: (_data, userId) => invalidate(userId),
  });
}
