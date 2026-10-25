import { useChannelMessagesQuery } from '@discordia/core';
import { useUIStore } from '../../app/uiStore';
import { useUsers } from '../../app/UsersProvider';
import { useCurrentServer } from '../servers/useCurrentServer';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile } from '../profile/profileActions';
import { useVoice } from '../voice/VoiceProvider';
import { ChatView } from './ChatView';
import { useMessageActions } from './useMessageActions';

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
  const { data: realMessages, isLoading } = useChannelMessagesQuery(
    selectedServerId !== 'home' ? selectedChannelId : null
  );


  return (
    <ChatView
      channel={currentChannel}
      messages={realMessages || []}
      isLoading={isLoading}
      currentUserId={currentUser.id}
      users={usersMap}
      isMemberListOpen={isMemberListOpen}
      onToggleMemberList={toggleMemberList}
      onSendMessage={actions.sendMessage}
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
