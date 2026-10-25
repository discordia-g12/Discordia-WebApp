import { useCallback, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MicOff, Shapes } from 'lucide-react';
import { transitions } from '../../ui';
import type { VoiceParticipant } from '../channels/ChannelSidebar';
import { VoiceParticipantMenu } from './VoiceParticipantMenu';
import styles from './VoiceView.module.css';


export type VoiceViewConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface BaseVoiceViewProps {
  /** Nombre del canal de voz activo. */
  channelName?: string;
  /** Nombre de la comunidad o servidor activo. */
  serverName?: string;
  /** ID del usuario actualmente autenticado. */
  currentUserId?: string;
  /** Participantes conectados en la sala de voz, con su estado de audio. */
  participants?: VoiceParticipant[];
  /** Estado de la conexión con el servidor de voz. */
  connectionState?: VoiceViewConnectionState;
  /** Estado de micrófono silenciado del usuario local. */
  isMuted?: boolean;
  /** Estado de ensordecido (deafened) del usuario local. */
  isDeafened?: boolean;
  /** Usuarios silenciados solo para este cliente. */
  locallyMutedUsers?: Record<string, boolean>;
  /** Callback al alternar micrófono local. */
  onToggleMute?: () => void;
  /** Callback al alternar ensordecido local. */
  onToggleDeafen?: () => void;
  /** Callback al silenciar o reactivar a otro participante solo para este cliente. */
  onToggleLocalMute?: (userId: string) => void;
  /** Callback para abandonar la sala de voz. */
  onDisconnect?: () => void;
  /** Callback al hacer clic en un usuario participante. */
  onSelectUser?: (user: VoiceParticipant['user']) => void;
}

export interface VoiceViewProps extends BaseVoiceViewProps {
  /** Abre la invitación al servidor ("Invitar a la llamada +"). */
  onInvite?: () => void;
}

/** Estado de la conexión con barra final, como el resto del microcopy. */
export const CONNECTION_LABEL: Record<VoiceViewConnectionState, string> = {
  connected: 'conectado/',
  connecting: 'conectando/',
  reconnecting: 'reconectando/',
  disconnected: 'desconectado/',
};

/** Columnas del mosaico según cuántas fichas hay (los participantes más la de invitar). */
/** Late solo mientras conecta o reconecta; desconectado es un estado quieto (y legible). */
export function isPending(state: VoiceViewConnectionState): boolean {
  return state === 'connecting' || state === 'reconnecting';
}

function columnsFor(tiles: number): number {
  if (tiles <= 1) return 1;
  if (tiles <= 4) return 2;
  if (tiles <= 9) return 3;
  return 4;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

/**
 * Canal de voz del rediseño (PDF, pág. 10): un mosaico a sangre separado por líneas finas, una ficha por
 * participante (su foto llenando la ficha, o sus iniciales), y una última con "Invitar a la llamada +" y
 * "Elegir actividad". Las fichas se reacomodan animadas cuando alguien entra o sale; a quien habla le
 * pulsa el borde. Los controles de la llamada están en la barra lateral (VoiceControls) y en la barra
 * de usuario.
 */
export function VoiceView({
  channelName = 'Voz',
  serverName,
  currentUserId = '',
  participants = [],
  connectionState = 'connected',
  locallyMutedUsers = {},
  onToggleLocalMute,
  onSelectUser,
  onInvite,
}: VoiceViewProps) {
  const reduce = useReducedMotion();
  const [contextMenu, setContextMenu] = useState<{ user: VoiceParticipant['user']; x: number; y: number } | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const columns = columnsFor(participants.length + 1);
  const layoutTransition = reduce ? transitions.reduced : transitions.slow;

  return (
    <div className={styles.voice}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          •{channelName}
          {serverName && <span className={styles.server}> / {serverName}</span>}
        </h1>
        <p className={`${styles.status} ${isPending(connectionState) ? styles.statusPending : ''}`} role="status">
          {CONNECTION_LABEL[connectionState]}
        </p>
      </header>

      <ul className={styles.grid} data-columns={columns} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} aria-label={`Participantes de ${channelName}`}>
        <AnimatePresence initial={false}>
          {participants.map(({ user, isSpeaking, isMuted }) => {
            const isMe = user.id === currentUserId;
            const locallyMuted = !isMe && Boolean(locallyMutedUsers[user.id]);
            return (
              <motion.li
                key={user.id}
                layout={!reduce}
                className={`${styles.tile} ${isSpeaking ? styles.speaking : ''}`}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                transition={layoutTransition}
                // Click derecho en toda la ficha (foto o etiqueta): silenciar solo para mí
                onContextMenu={(e: MouseEvent) => {
                  if (isMe || !onToggleLocalMute) return;
                  e.preventDefault();
                  setContextMenu({ user, x: e.clientX, y: e.clientY });
                }}
              >
                <button
                  type="button"
                  className={styles.tileButton}
                  onClick={() => onSelectUser?.(user)}
                  aria-label={`${user.displayName}${isMe ? ' (vos)' : ''}${isSpeaking ? ', hablando' : ''}`}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className={styles.photo} />
                  ) : (
                    <span className={styles.initials} aria-hidden="true">
                      {initials(user.displayName || user.username)}
                    </span>
                  )}
                </button>
                {/* Etiqueta negra al pie de la ficha, como la del rail */}
                <span className={styles.label}>
                  {isMuted && <MicOff size={12} strokeWidth={1.5} aria-label="Micrófono silenciado" />}
                  <span>
                    {user.displayName}
                    {isMe && ' (vos)'}
                  </span>
                  {locallyMuted && (
                    <span className={styles.localMute} role="img" aria-label="Silenciado para vos">
                      · silenciado para vos
                    </span>
                  )}
                </span>
              </motion.li>
            );
          })}

          <motion.li key="invite" layout={!reduce} className={`${styles.tile} ${styles.inviteTile}`} transition={layoutTransition}>
            <div className={styles.invite}>
              <button type="button" className={styles.inviteAction} onClick={onInvite} disabled={!onInvite}>
                Invitar a la llamada <strong aria-hidden="true">+</strong>
              </button>
              <button type="button" className={styles.inviteAction} disabled title="Las actividades todavía no están disponibles">
                Elegir actividad <Shapes size={14} strokeWidth={1.5} aria-hidden="true" />
                <span className={styles.soon}>próximamente</span>
              </button>
            </div>
          </motion.li>
        </AnimatePresence>
      </ul>

      {contextMenu && onToggleLocalMute && (
        <VoiceParticipantMenu
          user={contextMenu.user}
          x={contextMenu.x}
          y={contextMenu.y}
          isLocallyMuted={locallyMutedUsers[contextMenu.user.id] || false}
          onToggleLocalMute={onToggleLocalMute}
          onViewProfile={onSelectUser}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
