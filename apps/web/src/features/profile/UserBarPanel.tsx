import { useVoice } from '../voice/voiceContext';
import { useCurrentUser } from './currentUserStore';
import { useUserPanelActions } from './profileActions';
import { UserBar, type UserBarProps } from './UserBar';
import { useIsReconnecting } from '../../app/useConnectionStatus';

/**
 * Barra de usuario conectada a la sesión, la voz y las acciones de perfil. Colgar no va acá: está en los
 * controles de la llamada, justo arriba (VoiceControls).
 */
export function UserBarPanel({ tone }: { tone: UserBarProps['tone'] }) {
  const currentUser = useCurrentUser();
  const voice = useVoice();
  const actions = useUserPanelActions();
  const reconnecting = useIsReconnecting();

  return (
    <UserBar
      currentUser={currentUser}
      tone={tone}
      isMuted={voice.room.isMuted}
      isDeafened={voice.room.isDeafened}
      inVoiceChannel={voice.room.channelId !== null}
      reconnecting={reconnecting}
      onToggleMute={voice.room.toggleMute}
      onToggleDeafen={voice.room.toggleDeafen}
      onOpenSettings={actions.onOpenSettings}
      onChangeStatus={actions.onChangeStatus}
      onSaveCustomStatus={actions.onSaveCustomStatus}
      onEditProfile={actions.onEditProfile}
      onLogout={actions.onLogout}
    />
  );
}
