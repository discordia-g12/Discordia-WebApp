import { useState } from 'react';
import { Headphones, HeadphoneOff, Mic, MicOff, PhoneOff, Settings, type LucideIcon } from 'lucide-react';
import type { Status, User } from '../../types';
import { SquareAvatar } from '../../ui';
import { UserMiniProfile } from './UserMiniProfile';
import { StatusPicker } from './StatusPicker';
import styles from './UserBar.module.css';

export interface UserBarProps {
  currentUser: User;
  /**
   * Va con el tono de la marca de agua que tiene encima, así la palabra cortada se funde con la barra:
   * ink (inicio, bloque negro), sky (servidor) o muted (en llamada, gris).
   */
  tone?: 'ink' | 'sky' | 'muted';
  isMuted: boolean;
  isDeafened: boolean;
  inVoiceChannel?: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onOpenSettings: () => void;
  onDisconnectVoice?: () => void;
  onChangeStatus?: (status: Status) => void;
  onSaveCustomStatus?: (customStatus: string) => void;
  onEditProfile?: () => void;
  onBuyPoints?: () => void;
  onSubscribePremium?: () => void;
  onLogout?: () => void;
}

const STATUS_LABEL: Record<Status, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  invisible: 'Invisible',
  offline: 'Invisible',
};

/** Estado bajo el nombre, con barra final: "Invisible/", "En canal de voz/" o el estado personalizado. */
export function userBarStatus(user: Pick<User, 'status' | 'customStatus'>, inVoiceChannel: boolean): string {
  if (inVoiceChannel) return 'En canal de voz/';
  return `${user.customStatus || STATUS_LABEL[user.status] || STATUS_LABEL.offline}/`;
}

/**
 * Barra de usuario del rediseño, al pie de la barra lateral (PDF, págs. 6 y 7): avatar cuadrado, nombre y
 * estado; a la derecha micrófono, audio y ajustes separados por líneas finas. El nombre abre el mini
 * perfil (estado, editar perfil, cerrar sesión).
 */
export function UserBar({
  currentUser,
  tone = 'ink',
  isMuted,
  isDeafened,
  inVoiceChannel = false,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onDisconnectVoice,
  onChangeStatus,
  onSaveCustomStatus,
  onEditProfile,
  onBuyPoints,
  onSubscribePremium,
  onLogout,
}: UserBarProps) {
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  // Los popovers del diseño anterior se anclan arriba de la barra, a la derecha del rail
  const anchor = { bottom: 64, left: 76 };

  return (
    <footer className={`${styles.bar} ${styles[tone]}`}>
      <button
        type="button"
        className={styles.identity}
        onClick={() => setShowMiniProfile((v) => !v)}
        aria-expanded={showMiniProfile}
        title="Ver perfil y estado"
      >
        <SquareAvatar user={currentUser} size={28} />
        <span className={styles.text}>
          <span className={styles.name}>{currentUser.displayName}</span>
          <span className={styles.status}>{userBarStatus(currentUser, inVoiceChannel)}</span>
        </span>
      </button>

      <div className={styles.controls}>
        <Control
          icon={isMuted ? MicOff : Mic}
          label={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
          pressed={isMuted}
          onPress={onToggleMute}
        />
        <Control
          icon={isDeafened ? HeadphoneOff : Headphones}
          label={isDeafened ? 'Activar audio' : 'Ensordecer audio'}
          pressed={isDeafened}
          onPress={onToggleDeafen}
        />
        {inVoiceChannel && onDisconnectVoice && (
          <Control icon={PhoneOff} label="Salir del canal de voz" onPress={onDisconnectVoice} />
        )}
        <Control icon={Settings} label="Ajustes de usuario" onPress={onOpenSettings} />
      </div>

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
        anchorPosition={anchor}
      />

      {showStatusPicker && (
        <StatusPicker
          currentStatus={currentUser.status}
          currentCustomStatus={currentUser.customStatus}
          onSelectStatus={(st) => {
            onChangeStatus?.(st);
            setShowStatusPicker(false);
          }}
          onSaveCustomStatus={(txt) => {
            onSaveCustomStatus?.(txt);
            setShowStatusPicker(false);
          }}
          onClose={() => setShowStatusPicker(false)}
          position={anchor}
        />
      )}
    </footer>
  );
}

function Control({
  icon: Icon,
  label,
  pressed,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  /** Micrófono y audio: indica si están apagados. */
  pressed?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.control} ${pressed ? styles.controlOff : ''}`}
      onClick={onPress}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
