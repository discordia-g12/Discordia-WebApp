import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  conversationsQueryKey,
  conversationWithQueryKey,
  errorMessageFor,
  isMessageRequest,
  publicProfileQueryKey,
  useAcceptConversationMutation,
  useAcceptFriendRequestMutation,
  useBlockUserMutation,
  useCancelFriendRequestMutation,
  useDeclineConversationMutation,
  useDeclineFriendRequestMutation,
  useRemoveFriendMutation,
  useSendFriendRequestMutation,
  useUnblockUserMutation,
  type Conversation,
  type PublicProfile,
} from '@discordia/core'
import { useUI } from '../providers/AppProviders'

/**
 * Lo que se puede hacer con un usuario desde su perfil o su chat. `openedId`: el id con el que se abrió; puede ser
 * un alias, así que el perfil se refresca con ese y las acciones van con el canónico del perfil. Cada acción avisa
 * con un toast y resuelve en true si salió bien.
 */
export function useRelationshipActions(openedId: string, profile: PublicProfile | undefined) {
  const queryClient = useQueryClient()
  const { showToast } = useUI()
  const sendRequest = useSendFriendRequestMutation()
  const acceptRequest = useAcceptFriendRequestMutation()
  const declineRequest = useDeclineFriendRequestMutation()
  const cancelRequest = useCancelFriendRequestMutation()
  const removeFriend = useRemoveFriendMutation()
  const block = useBlockUserMutation()
  const unblock = useUnblockUserMutation()
  const acceptConversation = useAcceptConversationMutation()
  const declineConversation = useDeclineConversationMutation()
  const [busy, setBusy] = useState(false)
  // 202 del backend: no hay solicitud que mostrar, pero la interfaz se ve igual que con una creada
  const [requestSent, setRequestSent] = useState(false)

  const userId = profile?.id ?? openedId
  const requestId = profile?.friendRequestId

  const run = async (action: () => Promise<unknown>, success: string | null, failure: string) => {
    if (busy) return false
    setBusy(true)
    try {
      await action()
      queryClient.invalidateQueries({ queryKey: publicProfileQueryKey(openedId) })
      queryClient.invalidateQueries({ queryKey: conversationWithQueryKey(openedId) })
      if (success) showToast(success, 'success')
      return true
    } catch (err) {
      console.error('[DM] Acción fallida:', err)
      showToast(failure, 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  /** Quita de la lista la solicitud de mensaje de este usuario, si hay una. */
  const declinePendingConversation = async () => {
    const conversations = queryClient.getQueryData<Conversation[]>(conversationsQueryKey)
    const conversation = conversations?.find(c => c.otherUserId === userId)
    if (conversation && isMessageRequest(conversation)) await declineConversation.mutateAsync(conversation.id)
  }

  return {
    busy,
    requestSent,

    addFriend: async () => {
      if (busy) return false
      setBusy(true)
      try {
        const request = await sendRequest.mutateAsync({ userId })
        if (!request) setRequestSent(true)
        queryClient.invalidateQueries({ queryKey: publicProfileQueryKey(openedId) })
        showToast(request?.user.relationship === 'friend' ? 'Ahora son amigos' : 'Solicitud enviada', 'success')
        return true
      } catch (err) {
        showToast(
          errorMessageFor(err, { 409: 'Ya hay una solicitud pendiente.' }, 'No se pudo enviar la solicitud.'),
          'error',
        )
        return false
      } finally {
        setBusy(false)
      }
    },
    cancelRequest: () =>
      run(
        () => cancelRequest.mutateAsync({ requestId: requestId as string, userId }),
        'Solicitud cancelada',
        'No se pudo cancelar la solicitud.',
      ),
    acceptRequest: () =>
      run(() => acceptRequest.mutateAsync(requestId as string), 'Ahora son amigos', 'No se pudo aceptar la solicitud.'),
    declineRequest: () =>
      run(
        () => declineRequest.mutateAsync({ requestId: requestId as string, userId }),
        'Solicitud rechazada',
        'No se pudo rechazar la solicitud.',
      ),
    removeFriend: () => run(() => removeFriend.mutateAsync(userId), 'Ya no son amigos', 'No se pudo eliminar al amigo.'),
    unblock: () => run(() => unblock.mutateAsync(userId), 'Usuario desbloqueado', 'No se pudo desbloquear.'),
    // Bloquear desde una solicitud de mensaje es rechazarla y después bloquear: así sale de la lista
    block: () =>
      run(
        async () => {
          await declinePendingConversation()
          await block.mutateAsync(userId)
        },
        'Usuario bloqueado',
        'No se pudo bloquear.',
      ),
    acceptMessageRequest: (conversationId: string) =>
      run(() => acceptConversation.mutateAsync(conversationId), null, 'No se pudo aceptar el mensaje.'),
    declineMessageRequest: (conversationId: string) =>
      run(() => declineConversation.mutateAsync(conversationId), 'Mensaje rechazado', 'No se pudo rechazar el mensaje.'),
  }
}
