import { useQueryClient } from '@tanstack/react-query';
import { updateCachedMessages } from '@discordia/core';
import type { Message, MessageAttachment, Reaction } from '../../types';
import { showToast, useUIStore } from '../../app/uiStore';
import { useCurrentUser } from '../profile/currentUserStore';
import { useDmStore } from '../friends/dmStore';
import { useSendChannelMessage } from './chatConnectionContext';

/**
 * Acciones sobre los mensajes del canal o DM seleccionado. En un canal de servidor el envío va por
 * WebSocket y el resto se aplica sobre el caché de React Query (editar y borrar todavía no están en el
 * backend); en un DM, todo es local (dmStore).
 */
export function useMessageActions() {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const sendMessageWs = useSendChannelMessage();
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const selectedDmId = useUIStore((s) => s.selectedDmId);
  const updateDmMessages = useDmStore((s) => s.updateMessages);
  const setDmLastMessage = useDmStore((s) => s.setLastMessage);

  const isHome = selectedServerId === 'home';
  const activeKey = isHome ? selectedDmId : selectedChannelId;

  const updateChannelMessages = (channelId: string, update: (old: Message[]) => Message[]) =>
    updateCachedMessages(queryClient, channelId, update);

  // Enviar mensaje en canal o DM
  const sendMessage = async (content: string, attachment?: MessageAttachment, replyToId?: string) => {
    if (!isHome) {
      if (!selectedChannelId) return;
      const send = async () => {
        try {
          await sendMessageWs(content, attachment ? [attachment] : undefined);
        } catch {
          showToast('No se pudo enviar el mensaje', 'danger', { label: 'reintentar', onPress: send });
        }
      };
      await send();
      return;
    }

    const key = selectedDmId;
    if (!key) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      channelId: key,
      authorId: currentUser.id,
      userId: currentUser.id,
      content,
      timestamp: new Date().toISOString(),
      type: 'normal',
      replyToId: replyToId || null,
      attachments: attachment ? [attachment] : undefined,
      fileAttachment: attachment
        ? {
          name: attachment.name,
          size: typeof attachment.size === 'number' ? `${(attachment.size / 1024).toFixed(1)} KB` : (attachment.size || '0 KB'),
          type: attachment.type,
        }
        : undefined,
    };

    updateDmMessages(key, (messages) => [...messages, newMsg]);
    setDmLastMessage(key, content);
  };

  // Alternar reacción emoji
  const toggleReaction = (messageId: string, emoji: string) => {
    const key = activeKey;
    if (!key) return;

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

    if (!isHome) {
      updateChannelMessages(key, updater);
      return;
    }

    updateDmMessages(key, updater);
  };

  // Eliminar mensaje
  const deleteMessage = (messageId: string) => {
    const key = activeKey;
    if (!key) return;

    const markDeleted = (list: Message[]) =>
      list.map((m) => (m.id === messageId ? { ...m, type: 'deleted' as const, content: '' } : m));

    if (!isHome) {
      updateChannelMessages(key, markDeleted);
      showToast('Backend deletion not implemented yet', 'info');
      return;
    }

    updateDmMessages(key, markDeleted);
    showToast('Mensaje eliminado', 'info');
  };

  // Editar mensaje
  const editMessage = (messageId: string, newContent: string) => {
    const key = activeKey;
    if (!key) return;

    const applyEdit = (list: Message[]) =>
      list.map((m) => (m.id === messageId ? { ...m, content: newContent, edited: true } : m));

    if (!isHome) {
      updateChannelMessages(key, applyEdit);
      showToast('Backend editing not implemented yet', 'info');
      return;
    }

    updateDmMessages(key, applyEdit);
    showToast('Mensaje editado', 'success');
  };

  return { sendMessage, toggleReaction, deleteMessage, editMessage };
}
