import { useUIStore } from './uiStore';
import { GlobalModals } from './GlobalModals';
import { ToastNotification } from '../ui/legacy/Toast';
import { ServerRailPanel } from '../features/servers/ServerRailPanel';
import { MemberListPanel } from '../features/servers/MemberListPanel';
import { useCurrentServer } from '../features/servers/useCurrentServer';
import { useUpdateServer } from '../features/servers/serverActions';
import { ChannelSidebarPanel } from '../features/channels/ChannelSidebarPanel';
import { ChatPanel } from '../features/chat/ChatPanel';
import { VoicePanel } from '../features/voice/VoicePanel';
import { HomePanel } from '../features/friends/HomePanel';
import { OwnProfileView } from '../features/profile/OwnProfileView';
import { useCurrentUser, useCurrentUserStore } from '../features/profile/currentUserStore';
import { logoutWithToast } from '../features/profile/profileActions';
import { ServerSettings } from '../features/settings/ServerSettings';
import { UserSettings } from '../features/settings/UserSettings';
import { AnimatePresence } from 'motion/react';
import { isNewUi } from '../ui/flag';
import { UserSettingsScreen } from '../features/settings/user/UserSettingsScreen';
import { ServerSettingsScreen } from '../features/settings/server/ServerSettingsScreen';
import { OwnProfileScreen } from '../features/profile/own-profile/OwnProfileScreen';
import { AppShell } from './AppShell';
import styles from './DesktopLayout.module.css';

/** Escritorio: vistas a pantalla completa (perfil, ajustes) o la grilla rail / canales / contenido. */
export function DesktopLayout() {
  const appView = useUIStore((s) => s.appView);
  const setAppView = useUIStore((s) => s.setAppView);
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const isMemberListOpen = useUIStore((s) => s.isMemberListOpen);
  const toast = useUIStore((s) => s.toast);
  const { currentServer } = useCurrentServer();
  const currentUser = useCurrentUser();
  const saveProfile = useCurrentUserStore((s) => s.saveProfile);
  const updateServer = useUpdateServer();

  // Rediseño: ajustes de usuario, ajustes del servidor y perfil propio bajan como una cortina encima de
  // la grilla (que sigue montada, así no se corta el chat ni la llamada) y suben al cerrarse.
  if (isNewUi()) {
    const close = () => setAppView('chat');
    return (
      <>
        <AppShell />
        <AnimatePresence>
          {appView === 'user-settings' && (
            <UserSettingsScreen
              key="user-settings"
              currentUser={currentUser}
              onClose={close}
              onUpdateUser={saveProfile}
              onLogout={logoutWithToast}
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
      </>
    );
  }

  // Vistas a pantalla completa (Desktop)
  if (appView === 'own-profile') {
    return (
      <OwnProfileView
        currentUser={currentUser}
        onBack={() => setAppView('chat')}
        onSave={(updated) => {
          saveProfile(updated);
          setAppView('chat');
        }}
      />
    );
  }

  if (appView === 'server-settings' && currentServer) {
    return (
      <ServerSettings
        server={currentServer}
        currentUser={currentUser}
        onClose={() => setAppView('chat')}
        onUpdateServer={updateServer}
      />
    );
  }

  if (appView === 'user-settings') {
    return (
      <UserSettings
        currentUser={currentUser}
        onClose={() => setAppView('chat')}
        onUpdateUser={saveProfile}
        onLogout={logoutWithToast}
      />
    );
  }

  const isHome = selectedServerId === 'home';

  // Layout principal Desktop de tres niveles
  return (
    <div className={styles.root}>
      {/* Nivel 1: Carril de Servidores */}
      <ServerRailPanel />

      {/* Nivel 2: Sidebar del Servidor activo */}
      {!isHome && <ChannelSidebarPanel />}

      {/* Nivel 3: Contenido Principal */}
      <div className={styles.nivel3ContenidoPrincipal}>
        {isHome ? <HomePanel /> : appView === 'voice' ? <VoicePanel /> : <ChatPanel />}

        {/* Lista de Miembros (Panel derecho en canales de servidor) */}
        {!isHome && isMemberListOpen && appView === 'chat' && <MemberListPanel />}
      </div>

      {/* ── MODALES GLOBALES ── */}
      <GlobalModals />

      {toast && <ToastNotification message={toast.message} type={toast.type} />}
    </div>
  );
}
