import { useUIStore } from '../../app/uiStore';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile } from '../profile/profileActions';
import { useMessageActions } from '../chat/useMessageActions';
import { useDmStore } from './dmStore';
import { HomeView } from './HomeView';

/**
 * Inicio: amigos y mensajes directos. La lista de mensajes directos va a sidebarContainer (la columna
 * izquierda del layout, que ya tiene su barra de usuario); sin lugar (null), se ve solo el chat del DM.
 */
export function HomePanel({ sidebarContainer }: { sidebarContainer: HTMLElement | null }) {
  const currentUser = useCurrentUser();
  const directMessages = useDmStore((s) => s.directMessages);
  const selectedDmId = useUIStore((s) => s.selectedDmId);
  const setSelectedDmId = useUIStore((s) => s.setSelectedDmId);
  const { sendMessage } = useMessageActions();

  return (
    <HomeView
      sidebarContainer={sidebarContainer}
      currentUserId={currentUser.id}
      directMessages={directMessages}
      activeDirectMessageId={selectedDmId}
      onSelectDirectMessage={(id: string | null) => setSelectedDmId(id)}
      onOpenUserProfile={openUserProfile}
      onSendMessage={(_dmId: string, text: string) => sendMessage(text, undefined, undefined)}
    />
  );
}
