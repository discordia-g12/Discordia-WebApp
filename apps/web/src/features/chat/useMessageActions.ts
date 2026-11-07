import { useQueryClient } from '@tanstack/react-query';
import { deleteMessage as apiDeleteMessage, editMessage as apiEditMessage, updateCachedMessages } from '@discordia/core';
import type { Message, MessageAttachment, Reaction } from '../../types';
import { showToast } from '../../app/uiStore';
import { useCurrentUser } from '../profile/currentUserStore';
import { useSendChannelMessage } from './chatConnectionContext';

/**
 * Acciones sobre los mensajes de un canal o una conversación (`dm-…`). El envío al canal va por WebSocket
 * (el de un DM está en useDirectChat) y el resto se aplica sobre el caché de React Query: editar y borrar
 * todavía no están en el backend.
 */
export function useMessageActions(channelId: string | null) {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const sendMessageWs = useSendChannelMessage();

  const updateMessages = (update: (old: Message[]) => Message[]) => {
    if (channelId) updateCachedMessages(queryClient, channelId, update);
  };

  // Enviar mensaje al canal seleccionado
  const sendMessage = async (content: string, attachment?: MessageAttachment) => {
    if (!channelId) return;
    const send = async () => {
      try {
        await sendMessageWs(content, attachment ? [attachment] : undefined);
      } catch {
        showToast('No se pudo enviar el mensaje', 'danger', { label: 'reintentar', onPress: send });
      }
    };
    await send();
  };

  // Alternar reacción emoji
  const toggleReaction = (messageId: string, emoji: string) => {
    const updater = (list: Message[]) => {
      return list.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = msg.reactions || [];
        const existing = reactions.find((r) => r.emoji === emoji);
        let nextReactions: Reaction[];
        if (existing) {
          if (existing.reacted) {
            nextReactions = reactions
              .map((r) =>
                r.emoji === emoji
                  ? {
                    ...r,
                    count: r.count - 1,
                    reacted: false,
                    users: (r.users || []).filter((u) => u !== currentUser.id),
                  }
                  : r,
              )
              .filter((r) => r.count > 0);
          } else {
            nextReactions = reactions.map((r) =>
              r.emoji === emoji
                ? {
                  ...r,
                  count: r.count + 1,
                  reacted: true,
                  users: [...(r.users || []), currentUser.id],
                }
                : r,
            );
          }
        } else {
          nextReactions = [
            ...reactions,
            { emoji, count: 1, reacted: true, users: [currentUser.id] },
          ];
        }
        return { ...msg, reactions: nextReactions };
      });
    };

    updateMessages(updater);
  };

  // Eliminar mensaje
  const deleteMessage = async (messageId: string) => {
    if (!channelId) return;

    let previousMessage: Message | undefined;

    // 1. Actualización optimista
    updateMessages((list) => {
      previousMessage = list.find((m) => m.id === messageId);
      return list.map((m) =>
        m.id === messageId
          ? { ...m, type: 'deleted' as const, content: '', attachments: [] }
          : m,
      );
    });

    // 2. Llamada al backend
    try {
      await apiDeleteMessage(channelId, messageId);
    } catch (err: unknown) {
      // Rollback en caso de error
      if (previousMessage) {
        updateMessages((list) =>
          list.map((m) => (m.id === messageId ? previousMessage! : m)),
        );
      }
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el mensaje';
      showToast(message, 'danger');
    }
  };

  // Editar mensaje
  const editMessage = async (messageId: string, newContent: string) => {
    if (!channelId) return;

    let previousContent = '';
    let previousEdited = false;
    let previousEditedTimestamp: string | null | undefined = null;

    // 1. Actualización optimista
    updateMessages((list) =>
      list.map((m) => {
        if (m.id === messageId) {
          previousContent = m.content;
          previousEdited = m.edited ?? false;
          previousEditedTimestamp = m.editedTimestamp;
          return { ...m, content: newContent, edited: true };
        }
        return m;
      })
    );

    // 2. Llamada al backend
    try {
      const updated = await apiEditMessage(channelId, messageId, newContent);
      updateMessages((list) =>
        list.map((m) => (m.id === messageId ? { ...m, ...updated } : m))
      );
    } catch (err: unknown) {
      // Rollback en caso de error
      updateMessages((list) =>
        list.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: previousContent,
                edited: previousEdited,
                editedTimestamp: previousEditedTimestamp,
              }
            : m
        )
      );
      const message = err instanceof Error ? err.message : 'No se pudo editar el mensaje';
      showToast(message, 'danger');
    }
  };

  return { sendMessage, toggleReaction, deleteMessage, editMessage };
}
