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
import { VoiceParticipant } from './ChannelSidebar';
import { VoiceParticipantMenu } from './VoiceParticipantMenu';

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
export const VoiceView: React.FC<VoiceViewProps> = ({
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
      <div
        style={{
          height: 48,
          minHeight: 48,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
          backgroundColor: 'var(--bg-secondary-alt)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Volume2 size={22} style={{ color: 'var(--status-online)' }} />
          <div>
            <span style={{ fontWeight: 700, color: 'var(--header-primary)', fontSize: 15 }}>
              {channelName}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>
              / {serverName}
            </span>
          </div>
        </div>

        {/* Estado de la conexión RTC */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: CONNECTION_LABELS[connectionState].color,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: CONNECTION_LABELS[connectionState].color,
              display: 'inline-block',
              boxShadow: `0 0 8px ${CONNECTION_LABELS[connectionState].color}`,
            }}
          />
          <span>{CONNECTION_LABELS[connectionState].label}</span>
        </div>
      </div>

      {/* ==========================================================================
          GRID ADAPTABLE DE PARTICIPANTES (1-2 cols, 2x2, 3x3)
          ========================================================================== */}
      <div
        style={{
          flex: 1,
          padding: 20,
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: 16,
          alignContent: 'center',
          justifyContent: 'center',
          overflowY: 'auto',
        }}
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
              style={{
                position: 'relative',
                backgroundColor: '#1e1f22',
                borderRadius: 'var(--radius-lg)',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: isSpeaking
                  ? '3px solid var(--status-online)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: isSpeaking
                  ? '0 0 0 2px rgba(35, 165, 90, 0.2), 0 0 20px rgba(35, 165, 90, 0.4)'
                  : 'var(--shadow-sm)',
                transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              {/* Avatar Circular Grande con Halo de Speaking */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    padding: 3,
                    border: isSpeaking ? '3px solid var(--status-online)' : '3px solid transparent',
                    transition: 'border var(--transition-fast)',
                  }}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        backgroundColor: 'var(--brand)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        fontWeight: 700,
                        color: 'var(--text-white)',
                      }}
                    >
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
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: 'var(--danger)',
                    color: 'var(--text-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <VolumeX size={15} />
                </div>
              )}

              {/* Etiqueta inferior con nombre y estado de micrófono */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(4px)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {/* Indicador de micrófono */}
                {isUserMuted ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--danger)',
                    }}
                    title="Micrófono silenciado"
                  >
                    <MicOff size={14} />
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: isSpeaking ? 'var(--status-online)' : 'var(--text-muted)',
                    }}
                    title={isSpeaking ? 'Hablando' : 'En línea'}
                  >
                    <Mic size={14} />
                  </span>
                )}

                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: 'var(--header-primary)',
                  }}
                >
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
      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-secondary-alt)',
          borderTop: '1px solid rgba(0, 0, 0, 0.2)',
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'var(--bg-floating)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-floating)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Botón Micrófono (mute/unmute) */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: isMuted ? 'var(--danger)' : 'var(--bg-secondary)',
              color: 'var(--text-white)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color var(--transition-fast)',
            }}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Botón Auriculares (deafen/undeafen) */}
          <button
            onClick={onToggleDeafen}
            title={isDeafened ? 'Reactivar audio' : 'Ensordecer'}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: isDeafened ? 'var(--danger)' : 'var(--bg-secondary)',
              color: 'var(--text-white)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color var(--transition-fast)',
            }}
          >
            <Headphones size={20} />
          </button>

          {/* Botón Cámara (pendiente: por ahora solo audio) */}
          <button
            disabled
            title="Cámara: próximamente"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              border: 'none',
              cursor: 'not-allowed',
              opacity: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VideoOff size={20} />
          </button>

          {/* Botón Compartir Pantalla (pendiente: por ahora solo audio) */}
          <button
            disabled
            title="Compartir pantalla: próximamente"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              border: 'none',
              cursor: 'not-allowed',
              opacity: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MonitorOff size={20} />
          </button>

          {/* Botón Rojo Desconectar (Leave Call) */}
          <button
            onClick={onDisconnect}
            title="Desconectar"
            style={{
              height: 44,
              padding: '0 20px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--danger)',
              color: 'var(--text-white)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700,
              fontSize: 14,
              transition: 'background-color var(--transition-fast)',
            }}
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
