import { useMemo } from 'react';
import type { User } from '../../types';
import { SectionLabel, SquareAvatar } from '../../ui';
import type { MemberListProps } from './legacy/LegacyMemberList';
import styles from './MemberList.module.css';

export type { MemberListProps };

const isOffline = (user: User) => user.status === 'offline' || user.status === 'invisible';

const STATUS_LABEL: Record<User['status'], string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  offline: 'Desconectado',
  invisible: 'Desconectado',
};

/**
 * Miembros del servidor (columna derecha del chat), con la estructura de ACTIVO AHORA del inicio: la
 * fila de título alineada con el encabezado y los grupos como títulos cruzados por la línea. El color
 * del rol va en un cuadrado chico junto al nombre (el texto queda en el color del texto, por contraste).
 */
export function MemberList({ members = [], roles = [], onSelectMember, currentUserId = '' }: MemberListProps) {
  const rolesById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

  const groups = useMemo(() => {
    const admins: User[] = [];
    const moderators: User[] = [];
    const online: User[] = [];
    const offline: User[] = [];
    members.forEach((user) => {
      if (isOffline(user)) offline.push(user);
      else if (user.roleIds?.includes('r-admin') || user.isStaff) admins.push(user);
      else if (user.roleIds?.includes('r-mod')) moderators.push(user);
      else online.push(user);
    });
    return [
      { key: 'admins', title: 'Administración', list: admins },
      { key: 'moderators', title: 'Moderación', list: moderators },
      { key: 'online', title: 'Conectados', list: online },
      { key: 'offline', title: 'Desconectados', list: offline },
    ].filter((g) => g.list.length > 0);
  }, [members]);

  return (
    <aside className={styles.aside} aria-labelledby="miembros-titulo">
      <div className={styles.row}>
        <h2 id="miembros-titulo" className={styles.title}>
          Miembros — {members.length}
        </h2>
      </div>
      <div className={styles.body}>
        {groups.map((group) => (
          <section key={group.key} className={styles.group}>
            <SectionLabel>{`${group.title} — ${group.list.length}`}</SectionLabel>
            <ul className={styles.list}>
              {group.list.map((user) => {
                const roleColor = user.roleIds?.map((id) => rolesById.get(id)?.color).find(Boolean);
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={`${styles.member} ${isOffline(user) ? styles.offline : ''}`}
                      onClick={() => onSelectMember?.(user)}
                      aria-label={`Ver perfil de ${user.displayName}`}
                    >
                      <SquareAvatar user={user} size={28} status={user.status} />
                      <span className={styles.text}>
                        <span className={styles.name}>
                          {roleColor && <span className={styles.role} style={{ background: roleColor }} aria-hidden="true" />}
                          {user.displayName}
                          {user.id === currentUserId && <span className={styles.meta}> (vos)</span>}
                        </span>
                        <span className={styles.meta}>{user.customStatus || STATUS_LABEL[user.status]}/</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}

