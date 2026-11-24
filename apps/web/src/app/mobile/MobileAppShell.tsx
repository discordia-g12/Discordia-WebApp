import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, ChevronLeft, Compass, Hash, MessageSquare, Plus, User as UserIcon, type LucideIcon } from 'lucide-react';
import { ActionLink, ConnectionBanner, DisplayText, EmptyState, Logo, ServerStrip, Skeleton, SquareAvatar } from '../../ui';
import { useUIStore } from '../uiStore';
import { GlobalModals } from '../GlobalModals';
import { IncidentBanner } from '../../features/platform-status/IncidentBanner';
import { ToastHost } from '../ToastHost';
import { FullScreenViews } from '../FullScreenViews';
import { useIsReconnecting } from '../useConnectionStatus';
import { useCurrentServer } from '../../features/servers/useCurrentServer';
import { selectServer } from '../../features/servers/serverActions';
import { ChannelSidebarPanel } from '../../features/channels/ChannelSidebarPanel';
import { ChatPanel } from '../../features/chat/ChatPanel';
import { ThreadPanel } from '../../features/chat/ThreadPanel';
import { NotificationList } from '../../features/notifications/NotificationList';
import { useNotificationLevelMenu } from '../../features/notifications/useNotificationMenus';
import { VoicePanel } from '../../features/voice/VoicePanel';
import { VoiceControlsPanel } from '../../features/voice/VoiceControls';
import { CallControlsPanel } from '../../features/calls/CallControls';
import { CallNotices } from '../../features/calls/CallNotices';
import { isInCall, useCall } from '../../features/calls/callContext';
import { useVoice } from '../../features/voice/voiceContext';
import { MemberListPanel } from '../../features/servers/MemberListPanel';
import { HomePanel } from '../../features/friends/HomePanel';
import { SuspendedServerPanel } from '../../features/servers/SuspendedServerPanel';
import { UserBarPanel } from '../../features/profile/UserBarPanel';
import { UserMenuContent } from '../../features/profile/UserMenu';
import { useUserPanelActions } from '../../features/profile/profileActions';
import { useCurrentUser } from '../../features/profile/currentUserStore';
import { userBarStatus } from '../../features/profile/userBarStatus';
import { serverUnreadBadge, serverUnreadLabel } from '../../features/servers/unread';
import styles from './MobileAppShell.module.css';

export type MobileTab = 'servers' | 'messages' | 'notifications' | 'profile';

const TABS: { id: MobileTab; label: string; icon: LucideIcon }[] = [
  { id: 'servers', label: 'Servidores', icon: Hash },
  { id: 'messages', label: 'Mensajes', icon: MessageSquare },
  { id: 'notifications', label: 'Avisos', icon: Bell },
  { id: 'profile', label: 'Perfil', icon: UserIcon },
];

/**
 * Mobile web del rediseño (docs/TODO-REDISENO.md, sección 5): barra inferior con Servidores, Mensajes,
 * Avisos y Perfil; en Servidores, la tira de franjas arriba; cada pantalla con su encabezado gigante (la
 * marca de agua del escritorio). Usa los mismos paneles y el mismo estado (useUIStore) que el escritorio,
 * así el chat, la voz, los modales y los ajustes son los reales. El shell solo suma la pestaña y si un
 * canal está abierto a pantalla completa.
 */
export function MobileAppShell() {
  const { servers, currentServer, currentChannel, isLoadingServers } = useCurrentServer();
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedDm = useUIStore((s) => s.selectedDm);
  const openThread = useUIStore((s) => s.openThread);
  const appView = useUIStore((s) => s.appView);
  const isMemberListOpen = useUIStore((s) => s.isMemberListOpen);
  const voice = useVoice();
  const call = useCall();
  const reconnecting = useIsReconnecting();
  const [tab, setTab] = useState<MobileTab>('servers');
  const [channelOpen, setChannelOpen] = useState(false);
  // Último servidor abierto: Mensajes pasa al inicio ('home') y al volver a Servidores se retoma
  const lastServerId = useRef<string | null>(null);
  if (selectedServerId !== 'home') lastServerId.current = selectedServerId;

  // La lista de miembros es una pantalla aparte: arranca cerrada (en escritorio arranca abierta)
  useEffect(() => {
    if (useUIStore.getState().isMemberListOpen) useUIStore.getState().toggleMemberList();
  }, []);

  // En Servidores siempre hay un servidor elegido: el último, o el primero de la lista
  useEffect(() => {
    if (tab !== 'servers' || selectedServerId !== 'home' || selectedDm || servers.length === 0) return;
    const target = servers.find((s) => s.id === lastServerId.current) ?? servers[0];
    selectServer(target.id, servers);
  }, [tab, selectedServerId, selectedDm, servers]);

  // Un DM que se abre desde otra pestaña (el perfil de un miembro, por ejemplo) se ve en Mensajes
  useEffect(() => {
    if (selectedDm) setTab('messages');
  }, [selectedDm]);

  // Una llamada que se abre desde los controles (o al confirmar el cambio de canal) se ve en Servidores
  useEffect(() => {
    if (appView === 'voice') {
      setTab('servers');
      setChannelOpen(true);
    }
  }, [appView]);

  const goTo = (next: MobileTab) => {
    if (next === 'messages') selectServer('home', servers);
    else useUIStore.getState().setSelectedDm(null);
    if (next !== tab) setChannelOpen(false);
    setTab(next);
  };

  const pickServer = (serverId: string) => {
    selectServer(serverId, servers);
    setChannelOpen(false);
  };

  const inPrivateCall = isInCall(call.state);
  const inCall = voice.room.channelId !== null || inPrivateCall;

  return (
    <div className={styles.shell}>
      {tab === 'servers' && (
        <ServerTabsRow
          servers={servers}
          selectedServerId={selectedServerId}
          isLoading={isLoadingServers}
          onSelect={pickServer}
          onAdd={() => useUIStore.getState().setActiveModal('create-server')}
          onHome={() => goTo('messages')}
        />
      )}

      <main className={styles.content}>
        {/* El hilo tapa la pestaña: volver lo cierra y deja donde estaba */}
        {openThread && (
          <Pane backLabel="Volver" onBack={() => useUIStore.getState().setOpenThread(null)}>
            <ThreadPanel key={openThread.messageId} thread={openThread} />
          </Pane>
        )}
        {!openThread && tab === 'servers' &&
          (servers.length === 0 && !isLoadingServers ? (
            <Screen title="Servidores">
              <div className={styles.padded}>
                <EmptyState title="todavía no estás en ningún servidor" hint="creá uno o entrá con una invitación" />
                <div className={styles.links}>
                  <ActionLink onPress={() => useUIStore.getState().setActiveModal('create-server')}>crear servidor</ActionLink>
                  <ActionLink onPress={() => useUIStore.getState().setActiveModal('join-server')}>unirme con una invitación</ActionLink>
                </div>
              </div>
            </Screen>
          ) : channelOpen && currentServer && !currentServer.isSuspended ? (
            isMemberListOpen && appView === 'chat' ? (
              <Pane backLabel={currentChannel ? `•${currentChannel.name}` : 'Volver'} onBack={() => useUIStore.getState().toggleMemberList()}>
                <MemberListPanel />
              </Pane>
            ) : (
              <Pane backLabel={currentServer.name} onBack={() => setChannelOpen(false)}>
                {appView === 'voice' ? <VoicePanel /> : <ChatPanel />}
              </Pane>
            )
          ) : (
            <Screen title={currentServer?.name ?? 'Servidores'} tinted>
              {currentServer?.isSuspended ? (
                <SuspendedServerPanel server={currentServer} />
              ) : currentServer ? (
                <ChannelSidebarPanel onChannelOpened={() => setChannelOpen(true)} />
              ) : (
                <div className={styles.padded}>
                  <Skeleton lines={5} label="Cargando canales" />
                </div>
              )}
            </Screen>
          ))}

        {!openThread && tab === 'messages' && <MessagesTab dmOpen={selectedDm !== null} />}

        {!openThread && tab === 'notifications' && (
          <Screen title="Avisos">
            <div className={styles.padded}>
              {/* Un DM se ve en Mensajes (por selectedDm, arriba) y un hilo tapa la pestaña; un canal, en Servidores */}
              <NotificationList
                onOpened={(n) => {
                  if (!n.serverId || n.threadId) return;
                  setTab('servers');
                  setChannelOpen(true);
                }}
              />
            </div>
          </Screen>
        )}

        {!openThread && tab === 'profile' && <ProfileTab />}
      </main>

      {inCall && (
        <div className={styles.call}>
          <VoiceControlsPanel tone="muted" />
          <CallControlsPanel tone="muted" />
          <UserBarPanel tone="muted" />
        </div>
      )}

      <nav className={styles.tabs} aria-label="Secciones">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
            onClick={() => goTo(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <GlobalModals />
      <FullScreenViews />
      <ToastHost />
      <CallNotices />
      <ConnectionBanner active={reconnecting} />
      <IncidentBanner />
    </div>
  );
}

/** Tira de servidores de arriba: el logo (va al inicio: Mensajes), las franjas (se desliza de costado) y crear. */
function ServerTabsRow({
  servers,
  selectedServerId,
  isLoading,
  onSelect,
  onAdd,
  onHome,
}: {
  servers: ReturnType<typeof useCurrentServer>['servers'];
  selectedServerId: string;
  isLoading: boolean;
  onSelect: (serverId: string) => void;
  onAdd: () => void;
  onHome: () => void;
}) {
  const levelMenu = useNotificationLevelMenu();
  return (
    <nav className={styles.strips} aria-label="Servidores">
      <button type="button" className={styles.logo} onClick={onHome}>
        <Logo size={18} />
      </button>
      <ul className={styles.stripList} aria-busy={isLoading || undefined}>
        {servers.map((server) => (
          <li key={server.id}>
            <ServerStrip
              server={server}
              active={server.id === selectedServerId}
              unread={serverUnreadLabel(server)}
              badge={serverUnreadBadge(server)}
              orientation="horizontal"
              suspended={server.isSuspended}
              onPress={() => onSelect(server.id)}
              onOpenMenu={levelMenu.open({ scopeType: 'server', serverId: server.id }, server.name)}
            />
          </li>
        ))}
      </ul>
      <button type="button" className={styles.iconButton} onClick={onAdd} aria-label="Añadir un servidor" title="Añadir un servidor">
        <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => useUIStore.getState().setActiveModal('join-server')}
        aria-label="Unirme con una invitación"
        title="Unirme con una invitación"
      >
        <Compass size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
      {levelMenu.menu}
    </nav>
  );
}

/**
 * Pantalla de una pestaña: el encabezado gigante (el contexto, como la marca de agua del escritorio, pero
 * en tinta: acá es el título) y su contenido. tinted: celeste, como la barra lateral de un servidor.
 */
function Screen({ title, tinted = false, children }: { title: string; tinted?: boolean; children: ReactNode }) {
  return (
    <section className={`${styles.screen} ${tinted ? styles.sky : ''}`} aria-labelledby="mobile-screen-title">
      <h1 id="mobile-screen-title" className={styles.srOnly}>
        {title}
      </h1>
      <div className={styles.heading}>
        <DisplayText variant="watermark">
          {title}
        </DisplayText>
      </div>
      <div className={styles.screenBody}>{children}</div>
    </section>
  );
}

/** Algo abierto a pantalla completa (chat, voz, miembros, un DM), con la vuelta arriba. */
function Pane({ backLabel, onBack, children }: { backLabel: string; onBack: () => void; children: ReactNode }) {
  return (
    <section className={styles.pane}>
      <button type="button" className={styles.back} onClick={onBack} aria-label={`Volver a ${backLabel}`}>
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        <span>{backLabel}</span>
      </button>
      <div className={styles.paneBody}>{children}</div>
    </section>
  );
}

/** Mensajes: la lista de mensajes directos y los amigos; con un DM abierto, su chat. */
function MessagesTab({ dmOpen }: { dmOpen: boolean }) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);

  if (dmOpen) {
    return (
      <Pane backLabel="Mensajes" onBack={() => useUIStore.getState().setSelectedDm(null)}>
        {/* Sin lugar para la lista: HomePanel muestra el chat del DM */}
        <HomePanel sidebarContainer={null} />
      </Pane>
    );
  }

  return (
    <Screen title="Mensajes">
      <div ref={setSlot} className={styles.dmSlot} />
      <div className={styles.friends}>
        <HomePanel sidebarContainer={slot} />
      </div>
    </Screen>
  );
}

/** Perfil: quién sos, presencia, estado personalizado y atajos (lo mismo que el menú de la barra de usuario). */
function ProfileTab() {
  const user = useCurrentUser();
  const actions = useUserPanelActions();
  const reconnecting = useIsReconnecting();
  const voice = useVoice();
  const call = useCall();

  return (
    <Screen title="Perfil">
      <div className={styles.identity}>
        <SquareAvatar user={user} size={64} status={user.status} />
        <div>
          <p className={styles.name}>{user.displayName}</p>
          <p className={styles.meta}>@{user.username}</p>
          <p className={styles.meta}>{userBarStatus(user, voice.room.channelId !== null, reconnecting, isInCall(call.state))}</p>
        </div>
      </div>
      <UserMenuContent
        user={user}
        onChangeStatus={actions.onChangeStatus}
        onSaveCustomStatus={actions.onSaveCustomStatus}
        onEditProfile={actions.onEditProfile}
        onOpenSettings={actions.onOpenSettings}
        onOpenBackoffice={actions.onOpenBackoffice}
        onOpenPlatformStatus={actions.onOpenPlatformStatus}
        onLogout={actions.onLogout}
      />
    </Screen>
  );
}
