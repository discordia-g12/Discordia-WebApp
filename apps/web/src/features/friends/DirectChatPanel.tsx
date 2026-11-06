import { useEffect } from 'react';
import { useAutoMarkChannelRead } from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';
import { usePageVisible } from '../../app/usePageVisible';
import { useUsers } from '../../app/usersContext';
import { ActionLink, EmptyState, Skeleton } from '../../ui';
import { ChatView } from '../chat/ChatView';
import { useMessageActions } from '../chat/useMessageActions';
import { MessageRequestView } from './RequestCards';
import { useDirectChat } from './useDirectChat';
import { relationshipLinks, useRelationshipActions } from './useRelationshipActions';
import styles from './RequestCards.module.css';

interface DirectChatPanelProps {
  userId: string;
  currentUserId: string;
  onClose: () => void;
  onOpenUserProfile: (userId: string) => void;
}

/** Chat con un usuario: el mismo ChatView de los canales o, si es una solicitud de mensaje, su tarjeta. */
export function DirectChatPanel({ userId, currentUserId, onClose, onOpenUserProfile }: DirectChatPanelProps) {
  const chat = useDirectChat(userId);
  const { usersMap } = useUsers();
  const relationship = useRelationshipActions();
  const { conversation, profile, actions, user, messages } = chat;
  const isRequest = actions.composer === 'message_request';
  const messageActions = useMessageActions(conversation?.id ?? null);

  // Mientras el chat está en pantalla, lo que llega no suma no leídos y se marca leído
  const readingId = !chat.isLoading && !isRequest ? (conversation?.id ?? null) : null;
  const pageVisible = usePageVisible();
  useEffect(() => {
    useUIStore.getState().setReadingChannelId(readingId);
    return () => useUIStore.getState().setReadingChannelId(null);
  }, [readingId]);
  useAutoMarkChannelRead(readingId, messages.data?.[messages.data.length - 1]?.id, { enabled: pageVisible });

  if (chat.isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.status}>
          <Skeleton lines={6} label="Cargando conversación" />
        </div>
      </div>
    );
  }

  if (chat.isError) {
    return (
      <div className={styles.panel}>
        <div className={styles.status}>
          <EmptyState title="no se pudo abrir la conversación" hint="revisá tu conexión e intentá de nuevo" />
          <ActionLink onPress={chat.retry}>reintentar</ActionLink>
        </div>
      </div>
    );
  }

  if (isRequest && conversation) {
    return (
      <MessageRequestView
        conversation={conversation}
        user={user}
        profile={profile}
        onClose={onClose}
        onOpenUserProfile={onOpenUserProfile}
      />
    );
  }

  return (
    <ChatView
      directChat={{ conversationId: conversation?.id ?? null, user }}
      directActions={profile ? relationshipLinks(profile, relationship) : []}
      messages={messages.data || []}
      isLoading={messages.isLoading}
      hasOlderMessages={messages.hasOlder}
      isLoadingOlder={messages.isFetchingOlder}
      onLoadOlder={() => {
        messages.fetchOlder().then((result) => {
          if (result.isError) {
            showToast('No se pudieron cargar los mensajes anteriores', 'danger', { label: 'reintentar', onPress: () => messages.fetchOlder() });
          }
        });
      }}
      currentUserId={currentUserId}
      users={usersMap}
      writeBlock={actions.composerMessage}
      onSendMessage={chat.send}
      onToggleReaction={messageActions.toggleReaction}
      onDeleteMessage={messageActions.deleteMessage}
      onEditMessage={messageActions.editMessage}
      onOpenUserProfile={onOpenUserProfile}
    />
  );
}
