import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { useIsPlatformStaff } from '@discordia/core';
import { useUIStore } from './uiStore';
import { useCurrentServer } from '../features/servers/useCurrentServer';
import { useCanInCurrentServer } from '../features/servers/useServerPermission';
import { useUpdateServer } from '../features/servers/serverActions';
import { useCurrentUser, useCurrentUserStore } from '../features/profile/currentUserStore';

// Las tres pantallas van en chunks aparte (no hacen falta para el primer pintado) y se precargan cuando el
// navegador queda libre, así al abrirlas ya están. Cada una con su Suspense (con la key que mira
// AnimatePresence), para que una que carga no esconda la que se está yendo.
const loadUserSettings = () => import('../features/settings/user/UserSettingsScreen');
const loadServerSettings = () => import('../features/settings/server/ServerSettingsScreen');
const loadOwnProfile = () => import('../features/profile/own-profile/OwnProfileScreen');
// El backoffice se usa poco: no se precarga, baja recién al abrirlo
const loadAdmin = () => import('../features/admin/AdminScreen');
const UserSettingsScreen = lazy(() => loadUserSettings().then((m) => ({ default: m.UserSettingsScreen })));
const ServerSettingsScreen = lazy(() => loadServerSettings().then((m) => ({ default: m.ServerSettingsScreen })));
const OwnProfileScreen = lazy(() => loadOwnProfile().then((m) => ({ default: m.OwnProfileScreen })));
const AdminScreen = lazy(() => loadAdmin().then((m) => ({ default: m.AdminScreen })));

function preload() {
  void loadUserSettings();
  void loadServerSettings();
  void loadOwnProfile();
}

/**
 * Ajustes de usuario, ajustes del servidor, perfil propio y administración bajan como una cortina encima del
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
  const canInvite = useCanInCurrentServer()('CREATE_INSTANT_INVITE');
  const isStaff = useIsPlatformStaff();
  const close = () => setAppView('chat');

  useEffect(() => {
    if (typeof window.requestIdleCallback !== 'function') return void setTimeout(preload, 2000);
    const id = window.requestIdleCallback(preload, { timeout: 5000 });
    return () => window.cancelIdleCallback(id);
  }, []);

  return (
    <AnimatePresence>
      {appView === 'user-settings' && (
        <Suspense key="user-settings" fallback={null}>
          <UserSettingsScreen
            currentUser={currentUser}
            onClose={close}
            onUpdateUser={saveProfile}
            onLogout={() => useUIStore.getState().openConfirm('logout', '')}
          />
        </Suspense>
      )}
      {appView === 'server-settings' && currentServer && (
        <Suspense key="server-settings" fallback={null}>
          <ServerSettingsScreen
            server={currentServer}
            currentUser={currentUser}
            onClose={close}
            onUpdateServer={updateServer}
            onInvite={canInvite ? () => useUIStore.getState().setActiveModal('invite') : undefined}
            onDeleteServer={() => useUIStore.getState().openConfirm('delete-server', currentServer.name)}
            onLeaveServer={() => useUIStore.getState().openConfirm('leave-server', currentServer.name)}
          />
        </Suspense>
      )}
      {appView === 'own-profile' && (
        <Suspense key="own-profile" fallback={null}>
          <OwnProfileScreen currentUser={currentUser} onBack={close} onSave={saveProfile} />
        </Suspense>
      )}
      {appView === 'admin' && isStaff && (
        <Suspense key="admin" fallback={null}>
          <AdminScreen currentUser={currentUser} onClose={close} />
        </Suspense>
      )}
    </AnimatePresence>
  );
}
