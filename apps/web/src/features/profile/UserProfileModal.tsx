import type { Role, User } from '../../types';
import { ActionLink, Modal, ModalActions, SquareAvatar } from '../../ui';
import { userBarStatus } from './UserBar';
import styles from './UserProfileModal.module.css';

export interface UserProfileModalProps {
  user: User;
  currentUser?: User;
  /** Roles del servidor actual, para mostrar los que tiene el usuario. */
  roles?: Role[];
  onClose: () => void;
  onEditProfile?: () => void;
}

/**
 * Perfil de otro usuario (rediseño): el nombre en display, el banner como franja con el avatar cuadrado
 * encima, el estado con barra final, la bio y desde cuándo está. Solo lo que es real: el mensaje directo
 * queda en "próximamente" (no hay DMs en el backend) y no hay notas, bloqueo ni reportes que no se guardan.
 */
export function UserProfileModal({ user, currentUser, roles = [], onClose, onEditProfile }: UserProfileModalProps) {
  const isSelf = user.id === currentUser?.id;
  const userRoles = roles.filter((r) => user.roleIds?.includes(r.id));
  const since = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <Modal title={user.displayName || user.username} description={`@${user.username}`} onClose={onClose}>
      <div className={styles.card}>
        <div
          className={styles.banner}
          style={{ backgroundColor: user.bannerColor, backgroundImage: user.banner ? `url(${user.banner})` : undefined }}
          aria-hidden="true"
        />
        <div className={styles.avatar}>
          <SquareAvatar user={user} size={80} status={user.status} />
        </div>
        <p className={styles.status}>{userBarStatus(user, false)}</p>
      </div>

      <section className={styles.section} aria-label="Sobre mí">
        <h3 className={styles.label}>Sobre mí /</h3>
        <p className={user.bio ? undefined : styles.empty}>{user.bio || '/ todavía no escribió nada'}</p>
      </section>

      {since && (
        <section className={styles.section} aria-label="En Discordia desde">
          <h3 className={styles.label}>En Discordia desde /</h3>
          <p>{since}</p>
        </section>
      )}

      {userRoles.length > 0 && (
        <section className={styles.section} aria-label="Roles">
          <h3 className={styles.label}>Roles /</h3>
          <ul className={styles.roles}>
            {userRoles.map((role) => (
              <li key={role.id}>
                <span className={styles.roleColor} style={{ backgroundColor: role.color }} aria-hidden="true" />
                {role.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ModalActions>
        {isSelf ? (
          onEditProfile && <ActionLink onPress={onEditProfile}>editar perfil</ActionLink>
        ) : (
          <span className={styles.soon}>
            <ActionLink disabled>mensaje directo</ActionLink>
            <span className={styles.soonTag}>próximamente</span>
          </span>
        )}
      </ModalActions>
    </Modal>
  );
}
