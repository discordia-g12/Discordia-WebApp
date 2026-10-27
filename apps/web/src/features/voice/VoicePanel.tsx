import { useCurrentServer } from '../servers/useCurrentServer';
import { useCanInCurrentServer } from '../servers/useServerPermission';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile } from '../profile/profileActions';
import { useVoice } from './voiceContext';
import { useVoiceParticipants } from './useVoiceParticipants';
import { useUIStore } from '../../app/uiStore';
import { VoiceView } from './VoiceView';

/** Canal de voz a pantalla completa (mosaico de participantes y controles). */
export function VoicePanel() {
  const { currentChannel, currentServer } = useCurrentServer();
  const currentUser = useCurrentUser();
  const voice = useVoice();
  const { voiceParticipants } = useVoiceParticipants();
  const canInvite = useCanInCurrentServer()('CREATE_INSTANT_INVITE');

  return (
    <VoiceView
      channelName={currentChannel?.name || 'Voz'}
      serverName={currentServer?.name}
      currentUserId={currentUser.id}
      participants={voiceParticipants}
      connectionState={voice.room.connectionState}
      locallyMutedUsers={voice.room.locallyMutedUsers}
      onToggleLocalMute={voice.room.toggleLocalMute}
      onSelectUser={(u) => openUserProfile(u.id)}
      onInvite={canInvite ? () => useUIStore.getState().setActiveModal('invite') : undefined}
    />
  );
}
