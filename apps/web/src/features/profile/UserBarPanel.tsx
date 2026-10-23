import { useVoice } from '../voice/VoiceProvider';
import { useCurrentUser } from './currentUserStore';
import { useUserPanelActions } from './profileActions';
import { UserBar, type UserBarProps } from './UserBar';

/** Barra de usuario conectada a la sesión, la voz y las acciones de perfil. */
export function UserBarPanel({ tone }: { tone: UserBarProps['tone'] }) {
  const currentUser = useCurrentUser();
  const voice = useVoice();
  const actions = useUserPanelActions();

  return (
    <UserBar
      currentUser={currentUser}
      tone={tone}
      isMuted={voice.room.isMuted}
      isDeafened={voice.room.isDeafened}
      inVoiceChannel={voice.room.channelId !== null}
      onToggleMute={voice.room.toggleMute}
      onToggleDeafen={voice.room.toggleDeafen}
      onOpenSettings={actions.onOpenSettings}
      onDisconnectVoice={voice.disconnect}
      onChangeStatus={actions.onChangeStatus}
      onSaveCustomStatus={actions.onSaveCustomStatus}
      onEditProfile={actions.onEditProfile}
      onBuyPoints={actions.onBuyPoints}
      onSubscribePremium={actions.onSubscribePremium}
      onLogout={actions.onLogout}
    />
  );
}
