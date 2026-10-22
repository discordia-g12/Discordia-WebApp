import { useCurrentServer } from '../servers/useCurrentServer';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile } from '../profile/profileActions';
import { useVoice } from './VoiceProvider';
import { useVoiceParticipants } from './useVoiceParticipants';
import { VoiceView } from './VoiceView';

/** Canal de voz a pantalla completa (mosaico de participantes y controles). */
export function VoicePanel() {
  const { currentChannel, currentServer } = useCurrentServer();
  const currentUser = useCurrentUser();
  const voice = useVoice();
  const { voiceParticipants } = useVoiceParticipants();

  return (
    <VoiceView
      channelName={currentChannel?.name || 'Voz'}
      serverName={currentServer?.name}
      currentUserId={currentUser.id}
      participants={voiceParticipants}
      connectionState={voice.room.connectionState}
      isMuted={voice.room.isMuted}
      isDeafened={voice.room.isDeafened}
      locallyMutedUsers={voice.room.locallyMutedUsers}
      onToggleMute={voice.room.toggleMute}
      onToggleDeafen={voice.room.toggleDeafen}
      onToggleLocalMute={voice.room.toggleLocalMute}
      onDisconnect={voice.disconnect}
      onSelectUser={(u) => openUserProfile(u.id)}
    />
  );
}
