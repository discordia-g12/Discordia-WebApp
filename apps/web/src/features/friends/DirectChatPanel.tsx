import { useEffect } from 'react';
import {
  DM_HEADER_COMPACT_ICONS,
  canPinMessages,
  dmHeaderActions,
  useAutoMarkChannelRead,
  usePinnedMessagesQuery,
  type DmHeaderActionId,
} from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';
import { useIsMobile } from '../../app/useIsMobile';
import { usePageVisible } from '../../app/usePageVisible';
import { useUsers } from '../../app/usersContext';
import { ActionLink, EmptyState, Skeleton } from '../../ui';
import { ChatView } from '../chat/ChatView';
import { useMessageActions } from '../chat/useMessageActions';
import { CallPanel } from '../calls/CallPanel';
import { isCallOpen, useCall } from '../calls/callContext';
import { MessageRequestView } from './RequestCards';
import { useDirectChat } from './useDirectChat';
import { useRelationshipActions } from './useRelationshipActions';
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
  const pinned = usePinnedMessagesQuery(conversation?.id ?? null, { enabled: !isRequest });
  const call = useCall();
  // Pantalla angosta (mobile web): menos íconos, el resto al menú "más"
  const compact = useIsMobile();

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

  // Llamar: solo si se puede escribir (canCall) y no hay una llamada en curso en este chat (ahí está cortar)
  const callHere = isCallOpen(call.state) && call.state.conversationId === conversation?.id;
  const name = user.displayName || user.username;
  // Sin perfil (cuenta suspendida) no hay amistad ni bloqueo que ofrecer: solo llamar, fijados y perfil
  const headerActions = profile
    ? actions
    : { ...actions, canAddFriend: false, canRespondFriendRequest: false, canCancelFriendRequest: false, canRemoveFriend: false, canBlock: false, canUnblock: false };
  const requestId = profile?.friendRequestId;

  const onHeaderAction = (id: DmHeaderActionId) => {
    const otherId = profile?.id ?? userId;
    switch (id) {
      case 'call':
        if (!conversation) return;
        if (isCallOpen(call.state)) showToast('Ya estás en una llamada', 'info');
        else call.call(conversation.id, name);
        return;
      case 'add-friend':
        relationship.addFriend(otherId);
        return;
      case 'accept-friend':
        if (requestId) relationship.acceptFriend(requestId);
        return;
      case 'decline-friend':
        if (requestId) relationship.declineFriend(requestId, otherId);
        return;
      case 'cancel-friend-request':
        if (requestId) relationship.cancelFriendRequest(requestId, otherId);
        return;
      case 'remove-friend':
        relationship.removeFriend(otherId, name);
        return;
      case 'block':
        relationship.blockUser(otherId, name);
        return;
      case 'unblock':
        relationship.unblockUser(otherId);
        return;
    }
  };

  return (
    <ChatView
      directChat={{ conversationId: conversation?.id ?? null, user }}
      directHeader={{
        layout: (pinned) =>
          dmHeaderActions({
            name,
            actions: headerActions,
            hasConversation: Boolean(conversation),
            inCallHere: callHere,
            pinned,
            showProfile: true,
            friendRequestSending: relationship.sendingFriendRequest,
            maxIcons: compact ? DM_HEADER_COMPACT_ICONS : undefined,
          }),
        onAction: onHeaderAction,
      }}
      banner={conversation && <CallPanel conversationId={conversation.id} peer={user} />}
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
      onPinMessage={messageActions.togglePin}
      pinnedMessages={pinned.data ?? []}
      canPinMessages={Boolean(conversation) && canPinMessages({ isDirect: true })}
      onOpenUserProfile={onOpenUserProfile}
    />
  );
}
