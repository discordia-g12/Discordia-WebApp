import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Status, User } from '../../types';
import { ActionLink, Choice, SquareAvatar, useMotionPreset } from '../../ui';
import styles from './UserMenu.module.css';

export interface UserMenuProps {
  user: User;
  onClose: () => void;
  onChangeStatus?: (status: Status) => void;
  /** Guarda el estado personalizado en el perfil. */
  onSaveCustomStatus?: (customStatus: string) => void;
  onEditProfile?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

const PRESENCE_OPTIONS: { value: Status; label: string }[] = [
  { value: 'online', label: 'Conectado' },
  { value: 'idle', label: 'Ausente' },
  { value: 'dnd', label: 'No molestar' },
  { value: 'invisible', label: 'Invisible' },
];

/** Lo que tiene el menú de usuario: presencia, estado personalizado y atajos. Lo usa también Perfil en mobile. */
export function UserMenuContent({
  user,
  onChangeStatus,
  onSaveCustomStatus,
  onEditProfile,
  onOpenSettings,
  onLogout,
  onDone,
}: Omit<UserMenuProps, 'onClose'> & {
  /** Después de un atajo (el popover se cierra). */
  onDone?: () => void;
}) {
  const [customStatus, setCustomStatus] = useState(user.customStatus ?? '');
  const customStatusId = useId();
  const presence = user.status === 'offline' ? 'invisible' : user.status;
  const customChanged = customStatus.trim() !== (user.customStatus ?? '');

  const run = (action?: () => void) => () => {
    action?.();
    onDone?.();
  };

  return (
    <>
      <div className={styles.block}>
        <p className={styles.label}>Estado /</p>
        <Choice label="Estado" options={PRESENCE_OPTIONS} value={presence} onChange={(status) => onChangeStatus?.(status)} />
        <p className={styles.meta}>/ Por ahora vale solo para esta sesión.</p>
      </div>

      <form
        className={styles.block}
        onSubmit={(e) => {
          e.preventDefault();
          if (customChanged) onSaveCustomStatus?.(customStatus.trim());
        }}
      >
        <label htmlFor={customStatusId} className={styles.label}>
          Estado personalizado /
        </label>
        <div className={styles.field}>
          <input
            id={customStatusId}
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            placeholder="¿En qué andás?"
            maxLength={128}
          />
          {customChanged ? (
            <ActionLink type="submit">guardar</ActionLink>
          ) : (
            user.customStatus && (
              <ActionLink
                onPress={() => {
                  setCustomStatus('');
                  onSaveCustomStatus?.('');
                }}
              >
                quitar
              </ActionLink>
            )
          )}
        </div>
      </form>

      <div className={styles.links}>
        {onEditProfile && (
          <ActionLink onPress={run(onEditProfile)} title="Editar perfil">
            editar perfil
          </ActionLink>
        )}
        {onOpenSettings && <ActionLink onPress={run(onOpenSettings)}>ajustes</ActionLink>}
        {onLogout && <ActionLink onPress={run(onLogout)}>cerrar sesión</ActionLink>}
      </div>
    </>
  );
}

/**
 * Menú de la barra de usuario (rediseño): sube desde la barra, del ancho de la barra lateral. Presencia,
 * estado personalizado (se guarda en el perfil) y los atajos a editar perfil, ajustes y cerrar sesión.
 * Reemplaza al mini perfil y al selector de estado anteriores, sin puntos ni premium (no se guardan).
 * Se cierra con Escape o tocando afuera.
 */
export function UserMenu({ user, onClose, ...actions }: UserMenuProps) {
  const rise = useMotionPreset('rise');
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      // El botón que lo abre está afuera del menú: lo cierra él mismo
      const target = e.target as Element;
      if (ref.current?.contains(target) || target.closest?.('[data-user-menu-toggle]')) return;
      onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <motion.div ref={ref} className={styles.menu} role="dialog" aria-label="Tu perfil y estado" {...rise}>
      <div className={styles.identity}>
        <SquareAvatar user={user} size={40} />
        <div>
          <p className={styles.name}>{user.displayName}</p>
          <p className={styles.meta}>@{user.username}</p>
        </div>
      </div>
      <UserMenuContent user={user} {...actions} onDone={onClose} />
    </motion.div>
  );
}
