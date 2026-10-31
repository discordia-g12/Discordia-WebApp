import { useEffect } from 'react';
import { useAutoMarkChannelRead, useChannelMessagesQuery } from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';
import { usePageVisible } from '../../app/usePageVisible';
import { useUsers } from '../../app/usersContext';
import { useCurrentServer } from '../servers/useCurrentServer';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile } from '../profile/profileActions';
import { useVoice } from '../voice/voiceContext';
import { ChatView } from './ChatView';
import { useMessageActions } from './useMessageActions';
import { useChatWriteBlock } from './chatConnectionContext';

/** Chat del canal de texto seleccionado. */
export function ChatPanel() {
  const { currentChannel, allServerChannels } = useCurrentServer();
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const isMemberListOpen = useUIStore((s) => s.isMemberListOpen);
  const toggleMemberList = useUIStore((s) => s.toggleMemberList);
  const currentUser = useCurrentUser();
  const { usersMap } = useUsers();
  const voice = useVoice();
  const actions = useMessageActions();
  const writeBlock = useChatWriteBlock();
  const channelId = selectedServerId !== 'home' ? selectedChannelId : null;
  const { data: realMessages, isLoading, hasOlder, isFetchingOlder, fetchOlder } = useChannelMessagesQuery(channelId);

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
      isMemberListOpen={isMemberListOpen}
      onToggleMemberList={toggleMemberList}
      onSendMessage={actions.sendMessage}
      writeBlock={writeBlock}
      onToggleReaction={actions.toggleReaction}
      onDeleteMessage={actions.deleteMessage}
      onEditMessage={actions.editMessage}
      onOpenUserProfile={openUserProfile}
      onStartVoiceCall={() => {
        const vChan = allServerChannels.find((c) => c.type === 'voice');
        if (vChan) voice.join(vChan.id);
      }}
    />
  );
}
