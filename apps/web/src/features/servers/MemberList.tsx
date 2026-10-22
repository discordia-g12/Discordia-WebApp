import React, { useMemo } from 'react';
import { Sparkles, Shield, ShieldCheck } from 'lucide-react';
import { User, Role } from '../../types';
import styles from './MemberList.module.css';


/**
 * Propiedades del componente MemberList.
 */
export interface MemberListProps {
  /** Lista de miembros del servidor. Si no se provee, usa USERS de mock. */
  members?: User[];
  /** Roles del servidor para determinar colores e insignias. */
  roles?: Role[];
  /** Callback al hacer clic sobre un miembro para abrir su perfil. */
  onSelectMember?: (member: User) => void;
  /** ID del usuario en sesión activa. */
  currentUserId?: string;
}

/**
 * Obtiene el color de rol principal asignado a un usuario.
 */
function getMemberRoleColor(user: User, rolesMap: Map<string, Role>): string {
  if (!user.roleIds || user.roleIds.length === 0) return 'var(--text-normal)';

  for (const roleId of user.roleIds) {
    const role = rolesMap.get(roleId);
    if (role && role.color) {
      return role.color;
    }
  }

  return 'var(--text-normal)';
}

/**
 * Barra lateral derecha que muestra los miembros del servidor agrupados por jerarquía.
 */
export const MemberList: React.FC<MemberListProps> = ({
  members = [],
  roles = [],
  onSelectMember,
  currentUserId = '',
}) => {
  const rolesMap = useMemo(() => {
    const map = new Map<string, Role>();
    roles.forEach((r) => map.set(r.id, r));
    return map;
  }, [roles]);

  // Agrupación por jerarquía: Admin, Moderator, Members (online) y Offline
  const groups = useMemo(() => {
    const admins: User[] = [];
    const moderators: User[] = [];
    const onlineMembers: User[] = [];
    const offlineMembers: User[] = [];

    members.forEach((user) => {
      const isOffline = user.status === 'offline' || user.status === 'invisible';
      const hasAdminRole = user.roleIds?.includes('r-admin') || user.isStaff;
      const hasModRole = user.roleIds?.includes('r-mod');

      if (isOffline) {
        offlineMembers.push(user);
      } else if (hasAdminRole) {
        admins.push(user);
      } else if (hasModRole) {
        moderators.push(user);
      } else {
        onlineMembers.push(user);
      }
    });

    return [
      { key: 'admins', title: 'Admin', list: admins },
      { key: 'moderators', title: 'Moderator', list: moderators },
      { key: 'online', title: 'Members', list: onlineMembers },
      { key: 'offline', title: 'Offline', list: offlineMembers },
    ];
  }, [members]);

  return (
    <aside className="member-list scrollbar-thin">
      {groups.map((group) => {
        if (group.list.length === 0) return null;

        return (
          <div key={group.key} className={styles.div}>
            {/* Cabecera del Grupo Jerárquico */}
            <div className="member-group-header">
              {group.title} — {group.list.length}
            </div>

            {/* Lista de Miembros en la Categoría */}
            {group.list.map((user) => {
              const roleColor = getMemberRoleColor(user, rolesMap);
              const isCurrentUser = user.id === currentUserId;

              return (
                <div
                  key={user.id}
                  className="member-item"
                  onClick={() => onSelectMember?.(user)}
                  title={`Ver perfil de ${user.displayName}`}
                >
                  {/* Avatar con punto indicador de presencia */}
                  <div className={styles.avatarPuntoIndicadorPresencia}>
                    <img
                      src={
                        user.avatar || ''
                      }
                      alt={user.displayName}
                      className={styles.avatarPuntoIndicadorPresenciaImg}
                    />
                    <span
                      className={`status-dot ${user.status || 'offline'}`}
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                      }}
                    />
                  </div>

                  {/* Nombre, insignias y estado personalizado */}
                  <div className={styles.nombreInsigniasEstadoPersonalizado}>
                    <div className={styles.nombreInsigniasEstadoPersonalizadoDiv}>
                      <span
                        className={styles.nombreInsigniasEstadoPersonalizadoDivSpan} style={{ color: roleColor }}
                      >
                        {user.displayName}
                        {isCurrentUser && (
                          <span className={styles.tu}>
                            (tú)
                          </span>
                        )}
                      </span>

                      {/* Insignia de Staff / Admin */}
                      {user.isStaff && (
                        <span title="Staff de la plataforma">
                          <ShieldCheck size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                        </span>
                      )}

                      {user.roleIds?.includes('r-admin') && !user.isStaff && (
                        <span title="Administrador del servidor">
                          <Shield size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                        </span>
                      )}

                      {/* Estrella / Insignia de Discordia Premium */}
                      {user.isPremium && (
                        <span title="Discordia Premium / Nitro">
                          <Sparkles size={13} style={{ color: 'var(--text-warning)', flexShrink: 0 }} />
                        </span>
                      )}
                    </div>

                    {/* Estado personalizado */}
                    {user.customStatus && (
                      <p className={styles.nombreInsigniasEstadoPersonalizadoP}>
                        {user.customStatus}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
};
