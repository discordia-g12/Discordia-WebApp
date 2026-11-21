import { useState } from 'react';
import { layout } from '@discordia/tokens';
import type { Status, User } from '../types';
import { initials } from './initials';
import styles from './SquareAvatar.module.css';

interface SquareAvatarProps {
  user: Pick<User, 'displayName' | 'username'> & { avatar?: string | null };
  /** sm 24 px, md 40 px, lg 80 px (o un número en px). */
  size?: keyof typeof layout.avatarSize | number;
  /** Muestra la presencia como un cuadrado chico en la esquina. */
  status?: Status;
}

const STATUS_LABEL: Record<Status, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  offline: 'Desconectado',
  invisible: 'Invisible',
};

/** Avatar cuadrado: la foto, o las iniciales sobre un bloque invertido si no hay foto (o no carga). */
export function SquareAvatar({ user, size = 'md', status }: SquareAvatarProps) {
  const [broken, setBroken] = useState(false);
  const px = typeof size === 'number' ? size : layout.avatarSize[size];
  const name = user.displayName || user.username;

  return (
    <span className={styles.root} style={{ width: px, height: px, fontSize: Math.max(10, px * 0.36) }}>
      {user.avatar && !broken ? (
        <img src={user.avatar} alt={name} className={styles.image} onError={() => setBroken(true)} />
      ) : (
        <span className={styles.initials} role="img" aria-label={name}>
          {initials(name)}
        </span>
      )}
      {status && (
        <span className={`${styles.status} ${styles[status]}`} title={STATUS_LABEL[status]} role="img" aria-label={STATUS_LABEL[status]} />
      )}
    </span>
  );
}
