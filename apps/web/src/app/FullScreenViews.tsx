import { AnimatePresence } from 'motion/react';
import { useUIStore } from './uiStore';
import { useCurrentServer } from '../features/servers/useCurrentServer';
import { useUpdateServer } from '../features/servers/serverActions';
import { useCurrentUser, useCurrentUserStore } from '../features/profile/currentUserStore';
import { UserSettingsScreen } from '../features/settings/user/UserSettingsScreen';
import { ServerSettingsScreen } from '../features/settings/server/ServerSettingsScreen';
import { OwnProfileScreen } from '../features/profile/own-profile/OwnProfileScreen';

/**
 * Rediseño: ajustes de usuario, ajustes del servidor y perfil propio bajan como una cortina encima del
 * layout (que sigue montado, así no se corta el chat ni la llamada) y suben al cerrarse. Igual en
 * escritorio y en mobile.
 */
export function FullScreenViews() {
  const appView = useUIStore((s) => s.appView);
  const setAppView = useUIStore((s) => s.setAppView);
  const { currentServer } = useCurrentServer();
  const currentUser = useCurrentUser();
  const saveProfile = useCurrentUserStore((s) => s.saveProfile);
  const updateServer = useUpdateServer();
  const close = () => setAppView('chat');

  return (
    <AnimatePresence>
      {appView === 'user-settings' && (
        <UserSettingsScreen
          key="user-settings"
          currentUser={currentUser}
          onClose={close}
          onUpdateUser={saveProfile}
          onLogout={() => useUIStore.getState().openConfirm('logout', '')}
        />
      )}
      {appView === 'server-settings' && currentServer && (
        <ServerSettingsScreen
          key="server-settings"
          server={currentServer}
          currentUser={currentUser}
          onClose={close}
          onUpdateServer={updateServer}
          onInvite={() => useUIStore.getState().setActiveModal('invite')}
          onDeleteServer={() => useUIStore.getState().openConfirm('delete-server', currentServer.name)}
          onLeaveServer={() => useUIStore.getState().openConfirm('leave-server', currentServer.name)}
        />
      )}
      {appView === 'own-profile' && (
        <OwnProfileScreen key="own-profile" currentUser={currentUser} onBack={close} onSave={saveProfile} />
      )}
    </AnimatePresence>
  );
}
