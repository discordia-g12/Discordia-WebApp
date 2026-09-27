import React, { useState, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Headphones,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  Activity,
  Sparkles,
} from 'lucide-react';
import { User } from '../types';


/**
 * Propiedades para la vista de sala de voz y video en tiempo real.
 */
export interface VoiceViewProps {
  /** Nombre del canal de voz activo. */
  channelName?: string;
  /** Nombre de la comunidad o servidor activo. */
  serverName?: string;
  /** ID del usuario actualmente autenticado. */
  currentUserId?: string;
  /** Participantes conectados en la sala de voz. */
  participants?: User[];
  /** Estado de micrófono silenciado del usuario local. */
  isMuted?: boolean;
  /** Estado de ensordecido (deafened) del usuario local. */
  isDeafened?: boolean;
  /** Estado de transmisión de cámara del usuario local. */
  isVideoOn?: boolean;
  /** Estado de pantalla compartida del usuario local. */
  isScreenSharing?: boolean;
  /** Callback al alternar micrófono local. */
  onToggleMute?: () => void;
  /** Callback al alternar ensordecido local. */
  onToggleDeafen?: () => void;
  /** Callback al encender o apagar la cámara. */
  onToggleVideo?: () => void;
  /** Callback al iniciar o detener compartir pantalla. */
  onToggleScreenShare?: () => void;
  /** Callback para abandonar la sala de voz. */
  onDisconnect?: () => void;
  /** Callback al hacer clic en un usuario participante. */
  onSelectUser?: (user: User) => void;
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
 * Interfaz de sala de conferencia de voz y video en vivo.
 */
export const VoiceView: React.FC<VoiceViewProps> = ({
  channelName = 'Voz General',
  serverName = 'Indie Developers',
  currentUserId = '',
  participants: externalParticipants,
  isMuted: initialMuted = false,
  isDeafened: initialDeafened = false,
  isVideoOn: initialVideo = false,
  isScreenSharing: initialScreenShare = false,
  onToggleMute,
  onToggleDeafen,
  onToggleVideo,
  onToggleScreenShare,
  onDisconnect,
  onSelectUser,
}) => {
  // Lista de participantes por defecto (u0, u1, u2, u4)
  const defaultParticipants: User[] = useMemo(
    () => [],
    []
  );

  const participants = externalParticipants || defaultParticipants;

  // Estados locales independientes
  const [localMuted, setLocalMuted] = useState(initialMuted);
  const [localDeafened, setLocalDeafened] = useState(initialDeafened);
  const [localVideo, setLocalVideo] = useState(initialVideo);
  const [localScreenShare, setLocalScreenShare] = useState(initialScreenShare);

  // Registro de usuarios silenciados de forma local por este cliente
  const [locallyMutedUsers, setLocallyMutedUsers] = useState<Record<string, boolean>>({});

  // Simulación interactiva de quién está hablando
  const [speakingUserId, setSpeakingUserId] = useState<string>('u1');

  const isMuted = onToggleMute ? initialMuted : localMuted;
  const isDeafened = onToggleDeafen ? initialDeafened : localDeafened;
  const isVideoOn = onToggleVideo ? initialVideo : localVideo;
  const isScreenSharing = onToggleScreenShare ? initialScreenShare : localScreenShare;

  const handleMuteClick = () => {
    if (onToggleMute) {
      onToggleMute();
    } else {
      setLocalMuted((prev) => !prev);
    }
  };

  const handleDeafenClick = () => {
    if (onToggleDeafen) {
      onToggleDeafen();
    } else {
      setLocalDeafened((prev) => !prev);
    }
  };

  const handleVideoClick = () => {
    if (onToggleVideo) {
      onToggleVideo();
    } else {
      setLocalVideo((prev) => !prev);
    }
  };

  const handleScreenShareClick = () => {
    if (onToggleScreenShare) {
      onToggleScreenShare();
    } else {
      setLocalScreenShare((prev) => !prev);
    }
  };

  const toggleLocallyMuted = (userId: string) => {
    setLocallyMutedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Cálculo de columnas de la cuadrícula adaptativa
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

        {/* Indicador de Calidad WebRTC y Estado RTC */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--status-online)',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--status-online)',
                display: 'inline-block',
                boxShadow: '0 0 8px var(--status-online)',
              }}
            />
            <span>RTC Connected</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: 'var(--text-muted)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Activity size={12} style={{ color: 'var(--status-online)' }} />
            <span>18 ms (64 kbps)</span>
          </div>
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
        {participants.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          const isSpeaking = speakingUserId === user.id && (!isCurrentUser || !isMuted);
          const isUserMuted = isCurrentUser ? isMuted : locallyMutedUsers[user.id] || false;
          const hasVideo = isCurrentUser && isVideoOn;

          return (
            <div
              key={user.id}
              onClick={() => onSelectUser?.(user)}
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
              {/* Vista simulada de Video en Vivo si tiene cámara activa */}
              {hasVideo ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: '#111214',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage:
                      'radial-gradient(circle at 50% 50%, rgba(88, 101, 242, 0.15) 0%, transparent 80%)',
                  }}
                >
                  <img
                    src={user.avatar}
                    alt={user.displayName}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--brand)',
                    }}
                  />
                  <span
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: 'var(--brand)',
                      fontWeight: 600,
                      backgroundColor: 'rgba(88, 101, 242, 0.2)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    CAMERA ACTIVE
                  </span>
                </div>
              ) : (
                /* Avatar Circular Grande con Halo de Speaking */
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
              )}

              {/* Botón superior derecho: Silenciar localmente (para otros usuarios) */}
              {!isCurrentUser && (
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    toggleLocallyMuted(user.id);
                  }}
                  title={locallyMutedUsers[user.id] ? 'Reactivar audio de este usuario' : 'Silenciar para mí'}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: locallyMutedUsers[user.id] ? 'var(--danger)' : 'rgba(0, 0, 0, 0.6)',
                    color: 'var(--text-white)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background-color var(--transition-fast)',
                  }}
                >
                  {locallyMutedUsers[user.id] ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
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
            onClick={handleMuteClick}
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
            onClick={handleDeafenClick}
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

          {/* Botón Cámara (on/off) */}
          <button
            onClick={handleVideoClick}
            title={isVideoOn ? 'Apagar cámara' : 'Encender cámara'}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: isVideoOn ? 'var(--brand)' : 'var(--bg-secondary)',
              color: 'var(--text-white)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color var(--transition-fast)',
            }}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Botón Compartir Pantalla */}
          <button
            onClick={handleScreenShareClick}
            title={isScreenSharing ? 'Detener compartir pantalla' : 'Compartir pantalla'}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: isScreenSharing ? 'var(--brand)' : 'var(--bg-secondary)',
              color: 'var(--text-white)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color var(--transition-fast)',
            }}
          >
            {isScreenSharing ? <MonitorUp size={20} /> : <MonitorOff size={20} />}
          </button>

          {/* Selector interactivo de prueba para simular orador activo */}
          <button
            onClick={() =>
              setSpeakingUserId((prev) => (prev === 'u1' ? 'u4' : prev === 'u4' ? currentUserId || 'u1' : 'u1'))
            }
            title="Simular cambio de orador activo"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--interactive-normal)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={20} />
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
    </div>
  );
};
