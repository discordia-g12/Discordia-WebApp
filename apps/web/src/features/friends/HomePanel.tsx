import { useUIStore } from '../../app/uiStore';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile } from '../profile/profileActions';
import { HomeView } from './HomeView';

/**
 * Inicio: amigos y mensajes directos. La lista de mensajes directos va a sidebarContainer (la columna
 * izquierda del layout, que ya tiene su barra de usuario); sin lugar (null), se ve solo el chat del DM.
 */
export function HomePanel({ sidebarContainer }: { sidebarContainer: HTMLElement | null }) {
  const currentUser = useCurrentUser();
  const selected = useUIStore((s) => s.selectedDm);
  const setSelected = useUIStore((s) => s.setSelectedDm);

  return (
    <HomeView
      sidebarContainer={sidebarContainer}
      currentUserId={currentUser.id}
      selected={selected}
      onSelect={setSelected}
      onOpenUserProfile={openUserProfile}
    />
  );
}
