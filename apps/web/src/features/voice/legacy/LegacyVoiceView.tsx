import React, { useCallback, useMemo, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Headphones,
  VideoOff,
  MonitorOff,
  PhoneOff,
  Sparkles,
} from 'lucide-react';
import { VoiceParticipant } from '../../channels/ChannelSidebar';
import { VoiceParticipantMenu } from '../VoiceParticipantMenu';
import styles from './LegacyVoiceView.module.css';

export type VoiceViewConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

const CONNECTION_LABELS: Record<VoiceViewConnectionState, { label: string; color: string }> = {
  connected: { label: 'Voz conectada', color: 'var(--status-online)' },
  connecting: { label: 'Conectando…', color: 'var(--status-idle)' },
  reconnecting: { label: 'Reconectando…', color: 'var(--status-idle)' },
  disconnected: { label: 'Desconectado', color: 'var(--danger)' },
};

/**
 * Propiedades para la vista de sala de voz en tiempo real.
 */
export interface VoiceViewProps {
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

/**
 * Genera iniciales a partir del nombre para avatares de respaldo.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Interfaz de sala de voz en vivo.
 */
export const LegacyVoiceView: React.FC<VoiceViewProps> = ({
  channelName = 'Voz General',
  serverName = 'Indie Developers',
  currentUserId = '',
  participants = [],
  connectionState = 'connected',
  isMuted = false,
  isDeafened = false,
  locallyMutedUsers = {},
  onToggleMute,
  onToggleDeafen,
  onToggleLocalMute,
  onDisconnect,
  onSelectUser,
}) => {
  // Menú de click derecho sobre un participante
  const [contextMenu, setContextMenu] = useState<{ user: VoiceParticipant['user']; x: number; y: number } | null>(
    null
  );
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const gridColumns = useMemo(() => {
    const count = participants.length;
    if (count <= 1) return '1fr';
    if (count === 2) return 'repeat(2, 1fr)';
    if (count <= 4) return 'repeat(2, 1fr)';
    return 'repeat(3, 1fr)';
  }, [participants.length]);

  return (
    <div className="voice-container">
      {/* ==========================================================================
          CABECERA DE ESTADO DE VOZ
          ========================================================================== */}
      <div className={styles.cabeceraEstadoVoz}>
        <div className={styles.cabeceraEstadoVozDiv}>
          <Volume2 size={22} style={{ color: 'var(--status-online)' }} />
          <div>
            <span className={styles.cabeceraEstadoVozDivSpan}>
              {channelName}
            </span>
            <span className={styles.cabeceraEstadoVozDivSpan2}>
              / {serverName}
            </span>
          </div>
        </div>

        {/* Estado de la conexión RTC */}
        <div
          className={styles.estadoConexionRtc} style={{ color: CONNECTION_LABELS[connectionState].color }}
        >
          <span
            className={styles.estadoConexionRtcSpan} style={{ backgroundColor: CONNECTION_LABELS[connectionState].color, boxShadow: `0 0 8px ${CONNECTION_LABELS[connectionState].color}` }}
          />
          <span>{CONNECTION_LABELS[connectionState].label}</span>
        </div>
      </div>

      {/* ==========================================================================
          GRID ADAPTABLE DE PARTICIPANTES (1-2 cols, 2x2, 3x3)
          ========================================================================== */}
      <div
        className={styles.gridAdaptableParticipantes1} style={{ gridTemplateColumns: gridColumns }}
      >
        {participants.map(({ user, isSpeaking, isMuted: isUserMuted }) => {
          const isCurrentUser = user.id === currentUserId;
          const isLocallyMuted = !isCurrentUser && (locallyMutedUsers[user.id] || false);

          return (
            <div
              key={user.id}
              onClick={() => onSelectUser?.(user)}
              onContextMenu={(e: React.MouseEvent) => {
                if (isCurrentUser || !onToggleLocalMute) return;
                e.preventDefault();
                setContextMenu({ user, x: e.clientX, y: e.clientY });
              }}
              className={styles.gridAdaptableParticipantes1Div} style={{ borderRadius: 'var(--radius-lg)', border: isSpeaking
                  ? '3px solid var(--status-online)'
                  : '1px solid rgba(255, 255, 255, 0.06)', boxShadow: isSpeaking
                  ? '0 0 0 2px rgba(35, 165, 90, 0.2), 0 0 20px rgba(35, 165, 90, 0.4)'
                  : 'var(--shadow-sm)' }}
            >
              {/* Avatar Circular Grande con Halo de Speaking */}
              <div className={styles.avatarCircularGrandeHalo}>
                <div
                  className={styles.avatarCircularGrandeHaloDiv} style={{ borderRadius: '50%', border: isSpeaking ? '3px solid var(--status-online)' : '3px solid transparent' }}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className={styles.avatarCircularGrandeHaloDivImg}
                    />
                  ) : (
                    <div className={styles.avatarCircularGrandeHaloDivDiv}>
                      {getInitials(user.displayName)}
                    </div>
                  )}
                </div>
              </div>

              {/* Indicador de silenciado solo para este cliente (se cambia con click derecho) */}
              {isLocallyMuted && (
                <div
                  title="Silenciado para vos"
                  aria-label="Silenciado para vos"
                  className={styles.silenciadoVos}
                >
                  <VolumeX size={15} />
                </div>
              )}

              {/* Etiqueta inferior con nombre y estado de micrófono */}
              <div className={styles.etiquetaInferiorNombreEstado}>
                {/* Indicador de micrófono */}
                {isUserMuted ? (
                  <span
                    className={styles.microfonoSilenciado}
                    title="Micrófono silenciado"
                  >
                    <MicOff size={14} />
                  </span>
                ) : (
                  <span
                    className={styles.etiquetaInferiorNombreEstadoSpan} style={{ color: isSpeaking ? 'var(--status-online)' : 'var(--text-muted)' }}
                    title={isSpeaking ? 'Hablando' : 'En línea'}
                  >
                    <Mic size={14} />
                  </span>
                )}

                <span className={styles.etiquetaInferiorNombreEstadoSpan2}>
                  {user.displayName}
                  {isCurrentUser && ' (Tú)'}
                </span>

                {user.isPremium && (
                  <Sparkles size={13} style={{ color: 'var(--text-warning)' }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ==========================================================================
          BARRA INFERIOR DE CONTROLES FLOTANTE
          ========================================================================== */}
      <div className={styles.barraInferiorControlesFlotante}>
        <div className={styles.barraInferiorControlesFlotanteDiv}>
          {/* Botón Micrófono (mute/unmute) */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
            className={styles.botonMicrofonoMuteUnmute} style={{ backgroundColor: isMuted ? 'var(--danger)' : 'var(--bg-secondary)' }}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Botón Auriculares (deafen/undeafen) */}
          <button
            onClick={onToggleDeafen}
            title={isDeafened ? 'Reactivar audio' : 'Ensordecer'}
            className={styles.botonMicrofonoMuteUnmute} style={{ backgroundColor: isDeafened ? 'var(--danger)' : 'var(--bg-secondary)' }}
          >
            <Headphones size={20} />
          </button>

          {/* Botón Cámara (pendiente: por ahora solo audio) */}
          <button
            disabled
            title="Cámara: próximamente"
            className={styles.botonCamaraPendientePor}
          >
            <VideoOff size={20} />
          </button>

          {/* Botón Compartir Pantalla (pendiente: por ahora solo audio) */}
          <button
            disabled
            title="Compartir pantalla: próximamente"
            className={styles.botonCamaraPendientePor}
          >
            <MonitorOff size={20} />
          </button>

          {/* Botón Rojo Desconectar (Leave Call) */}
          <button
            onClick={onDisconnect}
            title="Desconectar"
            className={styles.botonRojoDesconectarLeave}
          >
            <PhoneOff size={18} />
            <span>Desconectar</span>
          </button>
        </div>
      </div>
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
};
