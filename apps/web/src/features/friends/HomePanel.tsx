import { useUIStore } from '../../app/uiStore';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile, useUserPanelActions } from '../profile/profileActions';
import { UserPanel } from '../profile/UserPanel';
import { useMessageActions } from '../chat/useMessageActions';
import { useVoice } from '../voice/VoiceProvider';
import { useVoiceParticipants } from '../voice/useVoiceParticipants';
import { useDmStore } from './dmStore';
import { HomeView } from './HomeView';

/**
 * Inicio: amigos y mensajes directos, con la barra de usuario. Con sidebarContainer (rediseño) la barra de
 * mensajes directos va a la columna izquierda del layout, que ya tiene su propia barra de usuario.
 */
export function HomePanel({ sidebarContainer }: { sidebarContainer?: HTMLElement | null }) {
  const currentUser = useCurrentUser();
  const directMessages = useDmStore((s) => s.directMessages);
  const selectedDmId = useUIStore((s) => s.selectedDmId);
  const setSelectedDmId = useUIStore((s) => s.setSelectedDmId);
  const voice = useVoice();
  const { activeVoice } = useVoiceParticipants();
  const userPanel = useUserPanelActions();
  const { sendMessage } = useMessageActions();

  return (
    <HomeView
      sidebarContainer={sidebarContainer}
      userPanel={
        sidebarContainer !== undefined ? null : <UserPanel
          currentUser={currentUser}
          isMuted={voice.room.isMuted}
          isDeafened={voice.room.isDeafened}
          onToggleMute={voice.room.toggleMute}
          onToggleDeafen={voice.room.toggleDeafen}
          onOpenSettings={userPanel.onOpenSettings}
          inVoiceChannel={voice.room.channelId !== null}
          voiceChannelName={activeVoice?.ch.name}
          voiceServerName={activeVoice?.srv.name}
          onDisconnectVoice={voice.disconnect}
          onChangeStatus={userPanel.onChangeStatus}
          onSaveCustomStatus={userPanel.onSaveCustomStatus}
          onEditProfile={userPanel.onEditProfile}
          onBuyPoints={userPanel.onBuyPoints}
          onSubscribePremium={userPanel.onSubscribePremium}
          onLogout={userPanel.onLogout}
        />
      }
      currentUserId={currentUser.id}
      directMessages={directMessages}
      activeDirectMessageId={selectedDmId}
      onSelectDirectMessage={(id) => setSelectedDmId(id)}
      onOpenUserProfile={openUserProfile}
      onSendMessage={(_dmId, text) => sendMessage(text, undefined, undefined)}
    />
  );
}
