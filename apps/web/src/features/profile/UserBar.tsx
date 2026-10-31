import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Headphones, HeadphoneOff, Mic, MicOff, PhoneOff, Settings, type LucideIcon } from 'lucide-react';
import type { Status, User } from '../../types';
import { userBarStatus } from './userBarStatus';
import { SquareAvatar } from '../../ui';
import { UserMenu } from './UserMenu';
import styles from './UserBar.module.css';

export interface UserBarProps {
  currentUser: User;
  /**
   * Va con el tono de la marca de agua que tiene encima, así la palabra cortada se funde con la barra:
   * ink (inicio, bloque negro), sky (servidor) o muted (en llamada, gris).
   */
  tone?: 'ink' | 'sky' | 'muted';
  isMuted: boolean;
  /** En la llamada no tiene permiso para hablar: el micrófono queda apagado y deshabilitado. */
  cannotSpeak?: boolean;
  isDeafened: boolean;
  inVoiceChannel?: boolean;
  /** Se cortó la conexión y la app está volviendo: el estado dice "reconectando/". */
  reconnecting?: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onOpenSettings: () => void;
  onDisconnectVoice?: () => void;
  onChangeStatus?: (status: Status) => void;
  onSaveCustomStatus?: (customStatus: string) => void;
  onEditProfile?: () => void;
  onOpenBackoffice?: () => void;
  onLogout?: () => void;
}

/**
 * Barra de usuario del rediseño, al pie de la barra lateral (PDF, págs. 6 y 7): avatar cuadrado, nombre y
 * estado; a la derecha micrófono, audio y ajustes separados por líneas finas. El nombre abre el menú
 * de usuario (estado, estado personalizado, editar perfil, ajustes, cerrar sesión).
 */
export function UserBar({
  currentUser,
  tone = 'ink',
  isMuted,
  cannotSpeak = false,
  isDeafened,
  inVoiceChannel = false,
  reconnecting = false,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onDisconnectVoice,
  onChangeStatus,
  onSaveCustomStatus,
  onEditProfile,
  onOpenBackoffice,
  onLogout,
}: UserBarProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <footer className={`${styles.bar} ${styles[tone]}`}>
      <button
        type="button"
        className={styles.identity}
        onClick={() => setShowMenu((v) => !v)}
        aria-expanded={showMenu}
        aria-haspopup="dialog"
        title="Ver perfil y estado"
        data-user-menu-toggle
      >
        <SquareAvatar user={currentUser} size={28} />
        <span className={styles.text}>
          <span className={styles.name}>{currentUser.displayName}</span>
          <span className={`${styles.status} ${reconnecting ? styles.reconnecting : ''}`}>
            {userBarStatus(currentUser, inVoiceChannel, reconnecting)}
          </span>
        </span>
      </button>

      <div className={styles.controls}>
        <Control
          icon={isMuted ? MicOff : Mic}
          label={
            cannotSpeak
              ? 'No tenés permiso para hablar en este canal'
              : isMuted
                ? 'Activar micrófono'
                : 'Silenciar micrófono'
          }
          pressed={isMuted}
          disabled={cannotSpeak}
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

      <AnimatePresence>
        {showMenu && (
          <UserMenu
            user={currentUser}
            onClose={() => setShowMenu(false)}
            onChangeStatus={onChangeStatus}
            onSaveCustomStatus={onSaveCustomStatus}
            onEditProfile={onEditProfile}
            onOpenSettings={onOpenSettings}
            onOpenBackoffice={onOpenBackoffice}
            onLogout={onLogout}
          />
        )}
      </AnimatePresence>
    </footer>
  );
}

function Control({
  icon: Icon,
  label,
  pressed,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  /** Micrófono y audio: indica si están apagados. */
  pressed?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.control} ${pressed ? styles.controlOff : ''}`}
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
