import { useState } from 'react';
import { useUIStore } from './uiStore';
import { GlobalModals } from './GlobalModals';
import { ConnectionBanner, DisplayText } from '../ui';
import { ToastHost } from './ToastHost';
import { IncidentBanner } from '../features/platform-status/IncidentBanner';
import { useIsReconnecting } from './useConnectionStatus';
import { useUsers } from './usersContext';
import { ServerRailPanel } from '../features/servers/ServerRailPanel';
import { MemberListPanel } from '../features/servers/MemberListPanel';
import { useCurrentServer } from '../features/servers/useCurrentServer';
import { ChannelSidebarPanel } from '../features/channels/ChannelSidebarPanel';
import { ChatPanel } from '../features/chat/ChatPanel';
import { ThreadPanel } from '../features/chat/ThreadPanel';
import { VoicePanel } from '../features/voice/VoicePanel';
import { HomePanel } from '../features/friends/HomePanel';
import { SuspendedServerPanel } from '../features/servers/SuspendedServerPanel';
import { UserBarPanel } from '../features/profile/UserBarPanel';
import { VoiceControlsPanel } from '../features/voice/VoiceControls';
import { CallControlsPanel } from '../features/calls/CallControls';
import { CallNotices } from '../features/calls/CallNotices';
import styles from './AppShell.module.css';

type Tone = 'ink' | 'sky' | 'muted';

/**
 * Contexto de la marca de agua y de la barra de usuario: AMIGOS (o el nombre del otro usuario en un DM)
 * en tinta en el inicio, el nombre del servidor en celeste, y en gris mientras se mira una llamada.
 */
function useShellContext(): { word: string; tone: Tone } {
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedDm = useUIStore((s) => s.selectedDm);
  const appView = useUIStore((s) => s.appView);
  const { usersMap } = useUsers();
  const { currentServer } = useCurrentServer();

  if (selectedServerId === 'home') {
    const other = selectedDm?.type === 'chat' ? usersMap[selectedDm.userId] : undefined;
    return { word: other?.displayName ?? 'Amigos', tone: 'ink' };
  }
  return { word: currentServer?.name ?? '', tone: appView === 'voice' ? 'muted' : 'sky' };
}

/**
 * Escritorio del rediseño (paso 5 de docs/TODO-REDISENO.md): grilla de líneas finas sobre el degradé que
 * deriva despacio. Rail | barra lateral (contenido, marca de agua cortada y barra de usuario) | contenido.
 *
 * El contenido de cada columna es de su feature (inicio, canales, chat, voz, miembros).
 */
export function AppShell() {
  const appView = useUIStore((s) => s.appView);
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const isMemberListOpen = useUIStore((s) => s.isMemberListOpen);
  const openThread = useUIStore((s) => s.openThread);
  const { word, tone } = useShellContext();
  const reconnecting = useIsReconnecting();
  // La barra de mensajes directos del inicio se monta acá por portal (ver HomeView)
  const [sidebarSlot, setSidebarSlot] = useState<HTMLDivElement | null>(null);
  const isHome = selectedServerId === 'home';
  // Suspendido por el staff: sin canales, chat ni miembros; solo el aviso (ADR-002 de Server-Roles)
  const { currentServer } = useCurrentServer();
  const suspendedServer = !isHome && currentServer?.isSuspended ? currentServer : null;

  // Modales, avisos y el banner de conexión van fuera de la grilla: la grilla aísla su apilado (isolation) y los ajustes se montan
  // encima de ella, así los modales que se abren desde los ajustes (invitar, eliminar) quedan arriba de todo.
  return (
    <>
      <div className={styles.shell}>
        <div className={styles.drift} aria-hidden="true" />

        <ServerRailPanel />

        <aside className={`${styles.sidebar} ${styles[tone]}`} aria-label={isHome ? 'Mensajes directos' : 'Canales'}>
          <div ref={setSidebarSlot} className={styles.sidebarContent}>
            {!isHome && !suspendedServer && <ChannelSidebarPanel />}
          </div>
          <div className={styles.sidebarFoot}>
            <DisplayText variant="watermark" tone={tone}>
              {word}
            </DisplayText>
            <VoiceControlsPanel tone={tone} />
            <CallControlsPanel tone={tone} />
            <UserBarPanel tone={tone} />
          </div>
        </aside>

        <main className={styles.main}>
          {isHome ? (
            <HomePanel sidebarContainer={sidebarSlot} />
          ) : suspendedServer ? (
            <SuspendedServerPanel server={suspendedServer} />
          ) : appView === 'voice' ? (
            <VoicePanel />
          ) : (
            <ChatPanel />
          )}
          {openThread && !suspendedServer ? (
            <ThreadPanel key={openThread.messageId} thread={openThread} />
          ) : (
            !isHome && !suspendedServer && isMemberListOpen && appView === 'chat' && <MemberListPanel />
          )}
        </main>
      </div>

      <GlobalModals />
      <ToastHost />
      <CallNotices />
      <ConnectionBanner active={reconnecting} />
      <IncidentBanner />
    </>
  );
}
