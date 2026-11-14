import {
  ApiError,
  useAcceptFriendRequestMutation,
  useBlockUserMutation,
  useCancelFriendRequestMutation,
  useDeclineConversationMutation,
  useDeclineFriendRequestMutation,
  useRemoveFriendMutation,
  useSendFriendRequestMutation,
  useUnblockUserMutation,
  dmActions,
  type PublicProfile,
} from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';

/** Texto para una solicitud de amistad rechazada por el backend. */
export function friendRequestErrorMessage(err: unknown, target?: string): string {
  const status = err instanceof ApiError ? err.status : undefined;
  if (status === 404) return target ? `No encontramos a "${target}".` : 'No encontramos a ese usuario.';
  if (status === 409) return 'Ya son amigos o ya hay una solicitud pendiente.';
  if (status === 422) return 'No podés enviarte una solicitud a vos mismo.';
  return 'No se pudo enviar la solicitud.';
}

/** Corre una acción y avisa cómo salió. Resuelve true si salió bien. */
async function attempt(action: () => Promise<unknown>, success: string | null, failure: string): Promise<boolean> {
  try {
    await action();
    if (success) showToast(success, 'success');
    return true;
  } catch {
    showToast(failure, 'danger');
    return false;
  }
}

/** Amistad y bloqueo, con sus avisos: lo mismo desde el chat, las tarjetas, la sección Amigos y el perfil. */
export function useRelationshipActions() {
  const sendRequest = useSendFriendRequestMutation();
  const acceptRequest = useAcceptFriendRequestMutation();
  const declineRequest = useDeclineFriendRequestMutation();
  const cancelRequest = useCancelFriendRequestMutation();
  const removeFriend = useRemoveFriendMutation();
  const declineConversation = useDeclineConversationMutation();
  const block = useBlockUserMutation();
  const unblock = useUnblockUserMutation();

  const blockWithConfirm = (userId: string, name: string, before?: () => Promise<unknown>, onBlocked?: () => void) =>
    useUIStore.getState().openConfirm('block-user', name, '', async () => {
      const blocked = await attempt(
        async () => {
          await before?.();
          await block.mutateAsync(userId);
        },
        `Bloqueaste a ${name}`,
        `No se pudo bloquear a ${name}`
      );
      if (blocked) onBlocked?.();
    });

  return {
    /** Se está mandando una solicitud de amistad (el encabezado del DM muestra "enviada" deshabilitado). */
    sendingFriendRequest: sendRequest.isPending,

    addFriend: async (userId: string) => {
      try {
        await sendRequest.mutateAsync({ userId });
        showToast('Solicitud de amistad enviada', 'success');
      } catch (err) {
        showToast(friendRequestErrorMessage(err), 'danger');
      }
    },

    /** Resuelve en el id del amigo nuevo, o null si falló. */
    acceptFriend: async (requestId: string): Promise<string | null> => {
      try {
        const friend = await acceptRequest.mutateAsync(requestId);
        showToast(`Ahora sos amigo de ${friend.displayName}`, 'success');
        return friend.id;
      } catch {
        showToast('No se pudo aceptar la solicitud', 'danger');
        return null;
      }
    },

    declineFriend: (requestId: string, userId?: string) =>
      attempt(() => declineRequest.mutateAsync({ requestId, userId }), null, 'No se pudo rechazar la solicitud'),

    cancelFriendRequest: (requestId: string, userId?: string) =>
      attempt(() => cancelRequest.mutateAsync({ requestId, userId }), null, 'No se pudo cancelar la solicitud'),

    removeFriend: (userId: string, name: string) =>
      useUIStore.getState().openConfirm('remove-friend', name, '', async () => {
        await attempt(() => removeFriend.mutateAsync(userId), `${name} ya no es tu amigo`, 'No se pudo eliminar al amigo');
      }),

    blockUser: (userId: string, name: string) => blockWithConfirm(userId, name),

    /** Desde una solicitud de mensaje: rechaza y después bloquea, para que salga de la lista (§2). */
    blockFromMessageRequest: (conversationId: string, userId: string, name: string, onBlocked: () => void) =>
      blockWithConfirm(userId, name, () => declineConversation.mutateAsync(conversationId), onBlocked),

    unblockUser: (userId: string) =>
      attempt(() => unblock.mutateAsync(userId), 'Usuario desbloqueado', 'No se pudo desbloquear'),
  };
}

export type RelationshipActions = ReturnType<typeof useRelationshipActions>;

export interface RelationshipLink {
  label: string;
  onPress: () => void;
}

/** Los enlaces de amistad y bloqueo que corresponden a un perfil, en el chat y en el perfil. */
export function relationshipLinks(profile: PublicProfile, actions: RelationshipActions): RelationshipLink[] {
  const { id, displayName, friendRequestId } = profile;
  const can = dmActions({ relationship: profile.relationship });
  const links: RelationshipLink[] = [];

  if (can.canAddFriend) links.push({ label: 'agregar amigo', onPress: () => actions.addFriend(id) });
  if (can.canCancelFriendRequest && friendRequestId) {
    links.push({ label: 'cancelar solicitud', onPress: () => actions.cancelFriendRequest(friendRequestId, id) });
  }
  if (can.canRespondFriendRequest && friendRequestId) {
    links.push({ label: 'aceptar amistad', onPress: () => actions.acceptFriend(friendRequestId) });
    links.push({ label: 'rechazar amistad', onPress: () => actions.declineFriend(friendRequestId, id) });
  }
  if (can.canRemoveFriend) links.push({ label: 'eliminar amigo', onPress: () => actions.removeFriend(id, displayName) });
  if (can.canBlock) links.push({ label: 'bloquear', onPress: () => actions.blockUser(id, displayName) });
  if (can.canUnblock) links.push({ label: 'desbloquear', onPress: () => actions.unblockUser(id) });
  return links;
}
