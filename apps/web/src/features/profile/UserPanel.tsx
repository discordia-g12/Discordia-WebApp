import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  Settings,
  PhoneOff,
  Radio,
  VolumeX,
} from 'lucide-react';
import { User, Status } from '../../types';
import { Avatar } from '../../ui/Avatar';
import { UserMiniProfile } from './UserMiniProfile';
import { StatusPicker } from './StatusPicker';

/**
 * Propiedades del componente UserPanel.
 */
export interface UserPanelProps {
  /** Usuario autenticado en la sesión activa. */
  currentUser: User;
  /** Estado de silencio del micrófono del usuario. */
  isMuted: boolean;
  /** Estado de ensordecimiento de audio del usuario. */
  isDeafened: boolean;
  /** Manejador para alternar el estado del micrófono. */
  onToggleMute: () => void;
  /** Manejador para alternar el ensordecimiento de audio. */
  onToggleDeafen: () => void;
  /** Manejador para abrir la configuración de usuario. */
  onOpenSettings: () => void;
  /** Indica si el usuario está actualmente conectado a una sala de voz. */
  inVoiceChannel?: boolean;
  /** Nombre del canal de voz activo conectado. */
  voiceChannelName?: string;
  /** Nombre del servidor asociado al canal de voz conectado. */
  voiceServerName?: string;
  /** Acción para desconectarse de la sala de voz activa. */
  onDisconnectVoice?: () => void;
  /** Callback para actualizar el estado de presencia del usuario. */
  onChangeStatus?: (status: Status) => void;
  /** Callback para guardar el estado personalizado textual. */
  onSaveCustomStatus?: (customStatus: string) => void;
  /** Callback para abrir el editor de perfil de usuario. */
  onEditProfile?: () => void;
  /** Callback para abrir la tienda o modal de compra de puntos. */
  onBuyPoints?: () => void;
  /** Callback para abrir el flujo de suscripción Nitro/Premium. */
  onSubscribePremium?: () => void;
  /** Callback para cerrar la sesión activa. */
  onLogout?: () => void;
}

/**
 * Traduce el estado estándar a una etiqueta legible en español.
 *
 * @param status - Estado del usuario.
 * @returns Cadena descriptiva legible.
 */
function getStatusLabel(status: Status): string {
  switch (status) {
    case 'online':
      return 'En línea';
    case 'idle':
      return 'Ausente';
    case 'dnd':
      return 'No molestar';
    case 'invisible':
    case 'offline':
    default:
      return 'Invisible';
  }
}

/**
 * Barra inferior anclada en el sidebar del servidor (Nivel 2).
 * Muestra el perfil del usuario activo, controles de micrófono/auriculares/ajustes,
 * la barra de estado de llamada de voz activa y despliegue del mini perfil.
 */
export const UserPanel: React.FC<UserPanelProps> = ({
  currentUser,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  inVoiceChannel = false,
  voiceChannelName,
  voiceServerName,
  onDisconnectVoice,
  onChangeStatus,
  onSaveCustomStatus,
  onEditProfile,
  onBuyPoints,
  onSubscribePremium,
  onLogout,
}) => {
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  return (
    <footer
      className="user-panel-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary-alt, #232428)',
        borderTop: '1px solid rgba(0, 0, 0, 0.2)',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Barra de Conexión de Voz (Voice Connected) */}
      {inVoiceChannel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 10px',
            backgroundColor: 'rgba(35, 165, 90, 0.12)',
            borderBottom: '1px solid rgba(35, 165, 90, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <Radio size={16} color="var(--status-online, #23a55a)" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--status-online, #23a55a)',
                  lineHeight: 1.1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Voz Conectada</span>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted, #949ba4)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={`${voiceChannelName || 'Canal de voz'} / ${voiceServerName || 'Servidor'}`}
              >
                {voiceChannelName || 'Canal de voz'} / {voiceServerName || 'Discordia'}
              </div>
            </div>
          </div>

          {/* Botón de desconexión rápida */}
          {onDisconnectVoice && (
            <button
              type="button"
              onClick={onDisconnectVoice}
              className="btn-icon"
              style={{
                color: 'var(--danger, #da373c)',
                width: '28px',
                height: '28px',
                flexShrink: 0,
              }}
              title="Desconectar llamada de voz"
            >
              <PhoneOff size={16} />
            </button>
          )}
        </div>
      )}

      {/* Controles de Usuario Principales */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 'var(--user-panel-height, 52px)',
          padding: '0 8px',
        }}
      >
        {/* Sección de Avatar e Identidad de Usuario */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowMiniProfile(!showMiniProfile)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 6px',
            borderRadius: 'var(--radius-sm, 4px)',
            cursor: 'pointer',
            minWidth: 0,
            flex: 1,
            marginRight: '4px',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              'var(--bg-modifier-hover, rgba(255, 255, 255, 0.06))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Ver perfil y estado"
        >
          <Avatar
            user={currentUser}
            size={32}
            showStatus={true}
            statusBg="var(--bg-secondary-alt, #232428)"
          />

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--header-primary, #f2f3f5)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}
            >
              {currentUser.displayName}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted, #949ba4)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}
              title={currentUser.customStatus || getStatusLabel(currentUser.status)}
            >
              {currentUser.customStatus || getStatusLabel(currentUser.status)}
            </div>
          </div>
        </div>

        {/* Botones de Acción Rápida: Micrófono, Auriculares, Ajustes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          {/* Micrófono */}
          <button
            type="button"
            onClick={onToggleMute}
            className="btn-icon"
            style={{
              color: isMuted ? 'var(--danger, #da373c)' : 'var(--interactive-normal, #b5bac1)',
              backgroundColor: isMuted ? 'rgba(218, 55, 60, 0.12)' : 'transparent',
            }}
            title={isMuted ? 'Desilenciar micrófono' : 'Silenciar micrófono'}
            aria-label={isMuted ? 'Desilenciar micrófono' : 'Silenciar micrófono'}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Auriculares / Ensordecer */}
          <button
            type="button"
            onClick={onToggleDeafen}
            className="btn-icon"
            style={{
              color: isDeafened ? 'var(--danger, #da373c)' : 'var(--interactive-normal, #b5bac1)',
              backgroundColor: isDeafened ? 'rgba(218, 55, 60, 0.12)' : 'transparent',
            }}
            title={isDeafened ? 'Desensordecer audio' : 'Ensordecer audio'}
            aria-label={isDeafened ? 'Desensordecer audio' : 'Ensordecer audio'}
          >
            {isDeafened ? <VolumeX size={18} /> : <Headphones size={18} />}
          </button>

          {/* Ajustes de Usuario */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="btn-icon"
            title="Ajustes de usuario"
            aria-label="Ajustes de usuario"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Popover UserMiniProfile flotante */}
      <UserMiniProfile
        user={currentUser}
        isOpen={showMiniProfile}
        onClose={() => setShowMiniProfile(false)}
        onEditProfile={onEditProfile}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
        onBuyPoints={onBuyPoints}
        onSubscribePremium={onSubscribePremium}
        onChangeStatus={onChangeStatus}
        onOpenStatusPicker={() => {
          setShowMiniProfile(false);
          setShowStatusPicker(true);
        }}
        anchorPosition={{ bottom: inVoiceChannel ? 86 : 56, left: 76 }}
      />

      {/* Popover StatusPicker flotante */}
      {showStatusPicker && (
        <StatusPicker
          currentStatus={currentUser.status}
          currentCustomStatus={currentUser.customStatus}
          onSelectStatus={(st) => {
            if (onChangeStatus) onChangeStatus(st);
            setShowStatusPicker(false);
          }}
          onSaveCustomStatus={(txt) => {
            if (onSaveCustomStatus) onSaveCustomStatus(txt);
            setShowStatusPicker(false);
          }}
          onClose={() => setShowStatusPicker(false)}
          position={{ bottom: inVoiceChannel ? 86 : 56, left: 76 }}
        />
      )}
    </footer>
  );
};

export default UserPanel;
