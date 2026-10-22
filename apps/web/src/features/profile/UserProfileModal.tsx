import React, { useState,   } from 'react';
import {
  X, ShieldAlert, AlertTriangle, Sparkles, MessageSquare, Zap , UserX, Flag
} from 'lucide-react';
import { User, Server, Role } from '../../types';
import { ModalOverlay } from '../../ui/ModalOverlay';

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
export const UserProfileModal: React.FC<UserProfileModalProps> = ({
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
      <div style={{ position: 'relative', overflow: 'hidden' }}>
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
          style={{
            height: 120,
            width: '100%',
            backgroundColor: user.bannerColor || 'var(--brand)',
            backgroundImage: user.banner ? `url(${user.banner})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        />

        {/* Contenedor del Avatar y Badges */}
        <div style={{ padding: '0 20px', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: -42,
              marginBottom: 12,
            }}
          >
            {/* Avatar con anillo de presencia */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 'var(--radius-full)',
                  border: '6px solid var(--bg-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <img
                  src={user.avatarUrl || user.avatar}
                  alt={user.displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              {/* Anillo/punto de presencia */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  width: 18,
                  height: 18,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: currentStatusColor,
                  border: '3px solid var(--bg-primary)',
                }}
                title={`Estado: ${user.status}`}
              />
            </div>

            {/* Badges de usuario */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                backgroundColor: 'var(--bg-secondary)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {user.isPremium && (
                <div title="Suscriptor Nitro" style={{ color: '#ff73fa', display: 'flex', alignItems: 'center' }}>
                  <Sparkles size={18} />
                </div>
              )}
              {user.badges?.includes('Server Booster') && (
                <div title="Server Booster" style={{ color: '#f47fff', display: 'flex', alignItems: 'center' }}>
                  <Zap size={18} />
                </div>
              )}
              {user.isStaff && (
                <div title="Staff Oficial de Discordia" style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center' }}>
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
            <div
              style={{
                backgroundColor: 'rgba(218, 55, 60, 0.15)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--text-danger)',
              }}
            >
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                <strong>Cuenta Suspendida:</strong> Este usuario ha sido inhabilitado temporalmente por infringir los Términos de Servicio de Discordia.
              </div>
            </div>
          )}

          {/* Nombre, username y bio */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--header-primary)' }}>
              {user.displayName}
            </h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>@{user.username}</span>
              {user.discriminator && <span>#{user.discriminator}</span>}
            </div>
            {user.customStatus && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: 'var(--interactive-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>💬</span>
                <span>{user.customStatus}</span>
              </div>
            )}
          </div>

          {/* Acciones principales */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 14,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              style={{
                padding: '8px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'about' ? '2px solid var(--brand)' : '2px solid transparent',
                color: activeTab === 'about' ? 'var(--header-primary)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Sobre mí
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('servers')}
              style={{
                padding: '8px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'servers' ? '2px solid var(--brand)' : '2px solid transparent',
                color: activeTab === 'servers' ? 'var(--header-primary)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Servidores en común
              <span
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 11,
                }}
              >
                {mutualServers.length}
              </span>
            </button>
          </div>

          {/* Contenido de la pestaña activa */}
          <div style={{ paddingBottom: 20 }}>
            {activeTab === 'about' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Bio */}
                <div>
                  <div className="input-label">SOBRE MÍ</div>
                  <p style={{ fontSize: 13, color: 'var(--text-normal)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {user.bio || 'Este usuario aún no ha escrito una biografía.'}
                  </p>
                </div>

                {/* Fecha de registro */}
                <div>
                  <div className="input-label">MIEMBRO DE DISCORDIA DESDE</div>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Noviembre 2021'}
                  </span>
                </div>

                {/* Roles */}
                {userRoles.length > 0 && (
                  <div>
                    <div className="input-label">ROLES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {userRoles.map((role: any) => (
                        <div
                          key={role.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 8px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 12,
                            color: 'var(--header-primary)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: role.color,
                            }}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {mutualServers.length > 0 ? (
                  mutualServers.map((server: any) => (
                    <div
                      key={server.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={server.iconUrl || server.icon}
                          alt={server.name}
                          style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--header-primary)' }}>
                            {server.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
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
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 13 }}>
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
