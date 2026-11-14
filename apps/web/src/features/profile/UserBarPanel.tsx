import { useVoice } from '../voice/voiceContext';
import { isInCall, useCall } from '../calls/callContext';
import { useCurrentUser } from './currentUserStore';
import { useUserPanelActions } from './profileActions';
import { UserBar, type UserBarProps } from './UserBar';
import { useIsReconnecting } from '../../app/useConnectionStatus';

/**
 * Barra de usuario conectada a la sesión, la voz y las acciones de perfil. Colgar no va acá: está en los
 * controles de la llamada, justo arriba (VoiceControls o, en una llamada privada, CallControls).
 */
export function UserBarPanel({ tone }: { tone: UserBarProps['tone'] }) {
  const currentUser = useCurrentUser();
  const voice = useVoice();
  const call = useCall();
  const actions = useUserPanelActions();
  const reconnecting = useIsReconnecting();

  return (
    <UserBar
      currentUser={currentUser}
      tone={tone}
      isMuted={voice.room.isMuted}
      cannotSpeak={voice.room.channelId !== null && !voice.room.canSpeak}
      isDeafened={voice.room.isDeafened}
      inVoiceChannel={voice.room.channelId !== null}
      inPrivateCall={isInCall(call.state)}
      reconnecting={reconnecting}
      onToggleMute={voice.room.toggleMute}
      onToggleDeafen={voice.room.toggleDeafen}
      onOpenSettings={actions.onOpenSettings}
      onChangeStatus={actions.onChangeStatus}
      onSaveCustomStatus={actions.onSaveCustomStatus}
      onEditProfile={actions.onEditProfile}
      onOpenBackoffice={actions.onOpenBackoffice}
      onOpenPlatformStatus={actions.onOpenPlatformStatus}
      onLogout={actions.onLogout}
    />
  );
}
