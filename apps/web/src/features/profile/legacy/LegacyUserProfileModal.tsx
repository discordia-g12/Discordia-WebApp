import React, { useState,   } from 'react';
import {
  X, ShieldAlert, AlertTriangle, Sparkles, MessageSquare, Zap , UserX, Flag
} from 'lucide-react';
import { User, Server, Role } from '../../../types';
import { ModalOverlay } from '../../../ui/legacy/ModalOverlay';
import styles from './LegacyUserProfileModal.module.css';

export interface UserProfileModalProps {
  user?: User & { isSuspended?: boolean };
  currentUser?: User;
  roles?: Role[];
  isOpen?: boolean;
  onClose: () => void;
  onSendDM?: (userId: string) => void;
  onEditProfile?: () => void;
  onReportUser?: (userId: string) => void;
  onBlockUser?: (userId: string) => void;
}

/**
 * Modal interactivo con banner, badges de Nitro/Booster, tabs About Me y Servidores en común.
 */
export const LegacyUserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUser,
  roles = [] as Role[],
  isOpen = true,
  onClose,
  onSendDM,
  onEditProfile,
  onReportUser,
  onBlockUser,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'servers'>('about');
  const [isBlocked, setIsBlocked] = useState(false);
  const [personalNote, setPersonalNote] = useState('');

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentUser?.id;
  const isSuspended = !!user.isSuspended;

  // Servidores compartidos simulados
  const mutualServers: Server[] = [];

  // Status color mapping
  const statusColors: Record<string, string> = {
    online: 'var(--status-online)',
    idle: 'var(--status-idle)',
    dnd: 'var(--status-dnd)',
    offline: 'var(--status-offline)',
    invisible: 'var(--status-offline)',
  };

  const currentStatusColor = statusColors[user.status] || 'var(--status-offline)';

  // Roles del usuario
  const userRoles = (roles || []).filter((r: Role) => user.roleIds?.includes(r.id));

  const handleBlockToggle = () => {
    setIsBlocked((prev) => !prev);
    onBlockUser?.(user.id);
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={520}>
      <div className={styles.div}>
        {/* Botón de cierre */}
        <button
          onClick={onClose}
          className="btn-icon"
          aria-label="Cerrar perfil"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 20,
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
          }}
        >
          <X size={18} />
        </button>

        {/* Banner de cabecera */}
        <div
          className={styles.bannerCabecera} style={{ backgroundColor: user.bannerColor || 'var(--brand)', backgroundImage: user.banner ? `url(${user.banner})` : undefined }}
        />

        {/* Contenedor del Avatar y Badges */}
        <div className={styles.contenedorAvatarBadges}>
          <div className={styles.contenedorAvatarBadgesDiv}>
            {/* Avatar con anillo de presencia */}
            <div className={styles.avatarAnilloPresencia}>
              <div className={styles.avatarAnilloPresenciaDiv}>
                <img
                  src={user.avatarUrl || user.avatar}
                  alt={user.displayName}
                  className={styles.avatarAnilloPresenciaDivImg}
                />
              </div>
              {/* Anillo/punto de presencia */}
              <div
                className={styles.anilloPuntoPresencia} style={{ backgroundColor: currentStatusColor }}
                title={`Estado: ${user.status}`}
              />
            </div>

            {/* Badges de usuario */}
            <div className={styles.badgesUsuario}>
              {user.isPremium && (
                <div title="Suscriptor Nitro" className={styles.suscriptorNitro}>
                  <Sparkles size={18} />
                </div>
              )}
              {user.badges?.includes('Server Booster') && (
                <div title="Server Booster" className={styles.serverBooster}>
                  <Zap size={18} />
                </div>
              )}
              {user.isStaff && (
                <div title="Staff Oficial de Discordia" className={styles.staffOficialDiscordia}>
                  <ShieldAlert size={18} />
                </div>
              )}
              {user.badges?.map((badge, idx) => (
                <span
                  key={idx}
                  className="badge badge-brand"
                  style={{ fontSize: 10, padding: '2px 6px' }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Aviso de cuenta suspendida */}
          {isSuspended && (
            <div className={styles.contenedorAvatarBadgesDiv2}>
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div className={styles.contenedorAvatarBadgesDiv2Div}>
                <strong>Cuenta Suspendida:</strong> Este usuario ha sido inhabilitado temporalmente por infringir los Términos de Servicio de Discordia.
              </div>
            </div>
          )}

          {/* Nombre, username y bio */}
          <div className={styles.nombreUsernameBio}>
            <h3 className={styles.nombreUsernameBioH3}>
              {user.displayName}
            </h3>
            <div className={styles.nombreUsernameBioDiv}>
              <span>@{user.username}</span>
              {user.discriminator && <span>#{user.discriminator}</span>}
            </div>
            {user.customStatus && (
              <div className={styles.nombreUsernameBioDiv2}>
                <span>💬</span>
                <span>{user.customStatus}</span>
              </div>
            )}
          </div>

          {/* Acciones principales */}
          <div className={styles.accionesPrincipales}>
            {isSelf ? (
              <button
                type="button"
                onClick={onEditProfile}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Editar Perfil
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSendDM?.(user.id)}
                  disabled={isSuspended || isBlocked}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <MessageSquare size={16} /> Enviar Mensaje
                </button>
                <button
                  type="button"
                  onClick={handleBlockToggle}
                  className={`btn ${isBlocked ? 'btn-danger' : 'btn-secondary'}`}
                  title={isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                >
                  <UserX size={16} /> {isBlocked ? 'Bloqueado' : 'Bloquear'}
                </button>
                <button
                  type="button"
                  onClick={() => onReportUser?.(user.id)}
                  className="btn btn-secondary"
                  title="Reportar usuario a moderación"
                >
                  <Flag size={16} />
                </button>
              </>
            )}
          </div>

          {/* Pestañas de navegación */}
          <div className={styles.pestanasNavegacion}>
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={styles.sobreMi} style={{ border: 'none', borderBottom: activeTab === 'about' ? '2px solid var(--brand)' : '2px solid transparent', color: activeTab === 'about' ? 'var(--header-primary)' : 'var(--text-muted)' }}
            >
              Sobre mí
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('servers')}
              className={styles.pestanasNavegacionButton} style={{ border: 'none', borderBottom: activeTab === 'servers' ? '2px solid var(--brand)' : '2px solid transparent', color: activeTab === 'servers' ? 'var(--header-primary)' : 'var(--text-muted)' }}
            >
              Servidores en común
              <span className={styles.pestanasNavegacionButtonSpan}>
                {mutualServers.length}
              </span>
            </button>
          </div>

          {/* Contenido de la pestaña activa */}
          <div className={styles.contenidoPestanaActiva}>
            {activeTab === 'about' ? (
              <div className={styles.contenidoPestanaActivaDiv}>
                {/* Bio */}
                <div>
                  <div className="input-label">SOBRE MÍ</div>
                  <p className={styles.bioP}>
                    {user.bio || 'Este usuario aún no ha escrito una biografía.'}
                  </p>
                </div>

                {/* Fecha de registro */}
                <div>
                  <div className="input-label">MIEMBRO DE DISCORDIA DESDE</div>
                  <span className={styles.fechaRegistroSpan}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Noviembre 2021'}
                  </span>
                </div>

                {/* Roles */}
                {userRoles.length > 0 && (
                  <div>
                    <div className="input-label">ROLES</div>
                    <div className={styles.contenidoPestanaActivaDivDiv}>
                      {userRoles.map((role: any) => (
                        <div
                          key={role.id}
                          className={styles.contenidoPestanaActivaDivDivDiv}
                        >
                          <span
                            className={styles.contenidoPestanaActivaDivDivDivSpan} style={{ backgroundColor: role.color }}
                          />
                          <span>{role.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nota privada para este usuario */}
                {!isSelf && (
                  <div>
                    <div className="input-label">NOTA PRIVADA</div>
                    <textarea
                      className="discord-input"
                      rows={2}
                      placeholder="Haz clic para añadir una nota que solo tú podrás ver..."
                      value={personalNote}
                      onChange={(e) => setPersonalNote(e.target.value)}
                      style={{ resize: 'none', fontSize: 12 }}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Pestaña Servidores en común */
              <div className={styles.contenidoPestanaActivaDiv2}>
                {mutualServers.length > 0 ? (
                  mutualServers.map((server: any) => (
                    <div
                      key={server.id}
                      className={styles.contenidoPestanaActivaDiv2Div}
                    >
                      <div className={styles.contenidoPestanaActivaDiv2DivDiv}>
                        <img
                          src={server.iconUrl || server.icon}
                          alt={server.name}
                          className={styles.contenidoPestanaActivaDiv2DivDivImg}
                        />
                        <div>
                          <div className={styles.contenidoPestanaActivaDiv2DivDivDiv}>
                            {server.name}
                          </div>
                          <div className={styles.contenidoPestanaActivaDiv2DivDivDiv2}>
                            {server.members.length} miembros
                          </div>
                        </div>
                      </div>
                      {server.boostLevel > 0 && (
                        <span className="badge badge-boost" style={{ fontSize: 10 }}>
                          Nivel {server.boostLevel}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={styles.contenidoPestanaActivaDiv2Div2}>
                    No compartes servidores con este usuario.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
};
