import { useEffect, useMemo } from 'react';
import {
  canInChannel,
  canPinMessages,
  useAutoMarkChannelRead,
  useChannelMessagesQuery,
  usePinnedMessagesQuery,
  useRolesQuery,
} from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';
import { usePageVisible } from '../../app/usePageVisible';
import { useUsers } from '../../app/usersContext';
import { useCurrentServer, useServerMemberUsers } from '../servers/useCurrentServer';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile } from '../profile/profileActions';
import { ChatView } from './ChatView';
import type { Mentionables } from './useChatViewState';
import { useMessageActions } from './useMessageActions';
import { useChatWriteBlock } from './chatConnectionContext';

/** Chat del canal de texto seleccionado. */
export function ChatPanel() {
  const { currentServer, currentChannel } = useCurrentServer();
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const isMemberListOpen = useUIStore((s) => s.isMemberListOpen);
  const toggleMemberList = useUIStore((s) => s.toggleMemberList);
  const setActiveModal = useUIStore((s) => s.setActiveModal);
  const currentUser = useCurrentUser();
  const { usersMap } = useUsers();
  const channelId = selectedServerId !== 'home' ? selectedChannelId : null;
  const actions = useMessageActions(channelId);
  const writeBlock = useChatWriteBlock();
  const canManageMessages = currentChannel
    ? canInChannel(currentServer, currentChannel, currentUser.id, 'MANAGE_MESSAGES')
    : false;
  const canAddReactions = currentChannel
    ? canInChannel(currentServer, currentChannel, currentUser.id, 'ADD_REACTIONS')
    : true;
  const { data: realMessages, isLoading, hasOlder, isFetchingOlder, fetchOlder, loadUntil } = useChannelMessagesQuery(channelId);
  const { data: pinnedMessages } = usePinnedMessagesQuery(channelId);

  // Menciones: miembros (con su perfil si ya llegó), roles del servidor y si puede usar @everyone y roles
  const memberUsers = useServerMemberUsers();
  const { data: roles } = useRolesQuery(selectedServerId !== 'home' ? selectedServerId : null);
  const mentionables = useMemo<Mentionables>(
    () => ({
      members: memberUsers.map((member) => ({ ...member, ...usersMap[member.id] })),
      roles: (roles ?? []).filter((role) => !role.isDefault),
      canMentionEveryone: currentChannel
        ? canInChannel(currentServer, currentChannel, currentUser.id, 'MENTION_EVERYONE')
        : false,
      myRoleIds: memberUsers.find((member) => member.id === currentUser.id)?.roleIds ?? [],
    }),
    [memberUsers, usersMap, roles, currentServer, currentChannel, currentUser.id]
  );

  // Mientras el chat está en pantalla, el canal no muestra no leídos y se marca leído con cada mensaje
  const pageVisible = usePageVisible();
  useEffect(() => {
    useUIStore.getState().setReadingChannelId(channelId);
    return () => useUIStore.getState().setReadingChannelId(null);
  }, [channelId]);
  useAutoMarkChannelRead(channelId, realMessages?.[realMessages.length - 1]?.id, { enabled: pageVisible });

  return (
    <ChatView
      channel={currentChannel}
      canManageMessages={canManageMessages}
      canAddReactions={canAddReactions}
      messages={realMessages || []}
      isLoading={isLoading}
      hasOlderMessages={hasOlder}
      isLoadingOlder={isFetchingOlder}
      onLoadOlder={() => {
        fetchOlder().then((result) => {
          if (result.isError) showToast('No se pudieron cargar los mensajes anteriores', 'danger', { label: 'reintentar', onPress: () => fetchOlder() });
        });
      }}
      currentUserId={currentUser.id}
      users={usersMap}
      mentionables={mentionables}
      isMemberListOpen={isMemberListOpen}
      onToggleMemberList={toggleMemberList}
      onOpenSearch={currentServer ? () => setActiveModal('search') : undefined}
      onSendMessage={actions.sendMessage}
      writeBlock={writeBlock}
      onToggleReaction={actions.toggleReaction}
      onDeleteMessage={actions.deleteMessage}
      onEditMessage={actions.editMessage}
      onPinMessage={actions.togglePin}
      pinnedMessages={pinnedMessages ?? []}
      canPinMessages={canPinMessages({ isDirect: false, canManageMessages })}
      onLoadUntilMessage={loadUntil}
      onOpenUserProfile={openUserProfile}
    />
  );
}
