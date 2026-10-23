import { useState } from 'react';
import { useUIStore } from './uiStore';
import { GlobalModals } from './GlobalModals';
import { ToastNotification } from '../ui/legacy/Toast';
import { DisplayText } from '../ui';
import { ServerRailPanel } from '../features/servers/ServerRailPanel';
import { MemberListPanel } from '../features/servers/MemberListPanel';
import { useCurrentServer } from '../features/servers/useCurrentServer';
import { ChannelSidebarPanel } from '../features/channels/ChannelSidebarPanel';
import { ChatPanel } from '../features/chat/ChatPanel';
import { VoicePanel } from '../features/voice/VoicePanel';
import { HomePanel } from '../features/friends/HomePanel';
import { useDmStore } from '../features/friends/dmStore';
import { UserBarPanel } from '../features/profile/UserBarPanel';
import styles from './AppShell.module.css';

type Tone = 'ink' | 'sky' | 'muted';

/**
 * Contexto de la marca de agua y de la barra de usuario: AMIGOS (o el nombre del otro usuario en un DM)
 * en tinta en el inicio, el nombre del servidor en celeste, y en gris mientras se mira una llamada.
 */
function useShellContext(): { word: string; tone: Tone } {
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedDmId = useUIStore((s) => s.selectedDmId);
  const appView = useUIStore((s) => s.appView);
  const directMessages = useDmStore((s) => s.directMessages);
  const { currentServer } = useCurrentServer();

  if (selectedServerId === 'home') {
    const dm = selectedDmId ? directMessages.find((d) => d.id === selectedDmId) : null;
    return { word: dm?.recipient?.displayName ?? 'Amigos', tone: 'ink' };
  }
  return { word: currentServer?.name ?? '', tone: appView === 'voice' ? 'muted' : 'sky' };
}

/**
 * Escritorio del rediseño (paso 5 de docs/TODO-REDISENO.md): grilla de líneas finas sobre el degradé que
 * deriva despacio. Rail | barra lateral (contenido, marca de agua cortada y barra de usuario) | contenido.
 *
 * El contenido de la barra lateral y de la columna principal todavía es el del diseño anterior: se
 * rediseña en los pasos 6 (inicio) y 7 (servidor y chat).
 */
export function AppShell() {
  const appView = useUIStore((s) => s.appView);
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const isMemberListOpen = useUIStore((s) => s.isMemberListOpen);
  const toast = useUIStore((s) => s.toast);
  const { word, tone } = useShellContext();
  // La barra de mensajes directos del inicio se monta acá por portal (ver HomeView)
  const [sidebarSlot, setSidebarSlot] = useState<HTMLDivElement | null>(null);
  const isHome = selectedServerId === 'home';

  return (
    <div className={styles.shell}>
      <div className={styles.drift} aria-hidden="true" />

      <ServerRailPanel />

      <aside className={`${styles.sidebar} ${styles[tone]}`} aria-label={isHome ? 'Mensajes directos' : 'Canales'}>
        <div ref={setSidebarSlot} className={styles.sidebarContent}>
          {!isHome && <ChannelSidebarPanel showUserPanel={false} />}
        </div>
        <div className={styles.sidebarFoot}>
          <DisplayText variant="watermark" tone={tone}>
            {word}
          </DisplayText>
          <UserBarPanel tone={tone} />
        </div>
      </aside>

      <main className={styles.main}>
        {isHome ? (
          <HomePanel sidebarContainer={sidebarSlot} />
        ) : appView === 'voice' ? (
          <VoicePanel />
        ) : (
          <ChatPanel />
        )}
        {!isHome && isMemberListOpen && appView === 'chat' && <MemberListPanel />}
      </main>

      <GlobalModals />
      {toast && <ToastNotification message={toast.message} type={toast.type} />}
    </div>
  );
}
