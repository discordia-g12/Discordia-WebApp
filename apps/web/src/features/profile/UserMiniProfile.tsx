import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Pencil,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Check,
  Gem,
} from 'lucide-react';
import { User, Status } from '../../types';
import { Avatar } from '../../ui/legacy/Avatar';
import styles from './UserMiniProfile.module.css';

/**
 * Propiedades del componente emergente UserMiniProfile.
 */
export interface UserMiniProfileProps {
  /** Entidad del usuario autenticado. */
  user: User;
  /** Visibilidad activa del popover. */
  isOpen: boolean;
  /** Callback para cerrar el menú emergente. */
  onClose: () => void;
  /** Acción para abrir el editor de perfil. */
  onEditProfile?: () => void;
  /** Acción para navegar a los ajustes de usuario. */
  onOpenSettings?: () => void;
  /** Acción para cerrar la sesión activa. */
  onLogout?: () => void;
  /** Acción para abrir la tienda o modal de compra de puntos. */
  onBuyPoints?: () => void;
  /** Acción para abrir el flujo de suscripción Premium/Nitro. */
  onSubscribePremium?: () => void;
  /** Callback para cambiar el estado de presencia directamente. */
  onChangeStatus?: (status: Status) => void;
  /** Callback para abrir el selector detallado de estado y custom status. */
  onOpenStatusPicker?: () => void;
  /** Coordenadas de anclaje para posicionar el popover. */
  anchorPosition?: { bottom?: number; left?: number; top?: number; right?: number };
}

/** Configuración de opciones de estado de presencia rápido. */
const STATUS_QUICK_OPTIONS: Array<{ id: Status; label: string; color: string }> = [
  { id: 'online', label: 'En línea', color: 'var(--status-online, #23a55a)' },
  { id: 'idle', label: 'Ausente', color: 'var(--status-idle, #f0b232)' },
  { id: 'dnd', label: 'No molestar', color: 'var(--status-dnd, #f23f43)' },
  { id: 'invisible', label: 'Invisible', color: 'var(--status-offline, #80848e)' },
];

/**
 * Popover emergente de perfil de usuario desplegable desde la barra inferior.
 * Muestra banner, avatar con anillo, custom status, saldo de puntos, tarjeta Premium,
 * selector de presencia rápido y atajos de configuración/logout.
 */
export const UserMiniProfile: React.FC<UserMiniProfileProps> = ({
  user,
  isOpen,
  onClose,
  onEditProfile,
  onOpenSettings,
  onLogout,
  onBuyPoints,
  onSubscribePremium,
  onChangeStatus,
  onOpenStatusPicker,
  anchorPosition = { bottom: 58, left: 78 },
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detección de click exterior y tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bannerStyle: React.CSSProperties = user.banner
    ? {
        backgroundImage: `url(${user.banner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundColor: user.bannerColor || 'var(--brand, #5865f2)',
      };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Perfil de usuario rápido"
      className={styles.perfilUsuarioRapido} style={{ bottom: anchorPosition.bottom !== undefined ? `${anchorPosition.bottom}px` : undefined, left: anchorPosition.left !== undefined ? `${anchorPosition.left}px` : undefined, top: anchorPosition.top !== undefined ? `${anchorPosition.top}px` : undefined, right: anchorPosition.right !== undefined ? `${anchorPosition.right}px` : undefined }}
    >
      {/* Banner de perfil */}
      <div
        style={{
          height: '75px',
          width: '100%',
          position: 'relative',
          ...bannerStyle,
        }}
      >
        {/* Botón rápido para editar perfil */}
        {onEditProfile && (
          <button
            type="button"
            onClick={onEditProfile}
            className={styles.editarPerfil}
            title="Editar perfil"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* Contenedor principal de cuerpo */}
      <div className={styles.contenedorPrincipalCuerpo}>
        {/* Avatar superpuesto con anillo protector */}
        <div className={styles.avatarSuperpuestoAnilloProtector}>
          <div className={styles.avatarSuperpuestoAnilloProtectorDiv}>
            <Avatar
              user={user}
              size={68}
              showStatus={true}
              statusBg="var(--bg-floating, #111214)"
            />
          </div>

          {/* Badges de usuario */}
          {user.badges && user.badges.length > 0 && (
            <div className={styles.avatarSuperpuestoAnilloProtectorDiv2}>
              {user.badges.map((badge) => (
                <span
                  key={badge}
                  title={badge}
                  className={styles.avatarSuperpuestoAnilloProtectorDiv2Span}
                >
                  {badge.includes('Nitro') ? (
                    <Gem size={14} color="#f47fff" />
                  ) : badge.includes('Staff') ? (
                    '🛡️'
                  ) : badge.includes('Supporter') ? (
                    '⭐'
                  ) : (
                    '🎖️'
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Nombres de usuario */}
        <div className={styles.nombresUsuario}>
          <h3 className={styles.nombresUsuarioH3}>
            {user.displayName}
          </h3>
          <p className={styles.nombresUsuarioP}>
            @{user.username}
            {user.discriminator ? `#${user.discriminator}` : ''}
          </p>
        </div>

        {/* Bocadillo con estado personalizado */}
        {user.customStatus && (
          <div className={styles.contenedorPrincipalCuerpoDiv}>
            <span>{user.customStatus}</span>
          </div>
        )}

        {/* Saldo de Puntos 💠 */}
        <div className={styles.saldoPuntos}>
          <div className={styles.saldoPuntosDiv}>
            <span className={styles.saldoPuntosDivSpan}>💠</span>
            <div>
              <div className={styles.puntosDiscordia}>
                Puntos Discordia
              </div>
              <div className={styles.saldoPuntosDivDiv}>
                {user.points ?? 0} pts
              </div>
            </div>
          </div>
          {onBuyPoints && (
            <button
              type="button"
              onClick={onBuyPoints}
              className="btn btn-primary"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                height: '26px',
              }}
            >
              Comprar
            </button>
          )}
        </div>

        {/* Tarjeta Promocional / Activa de Premium */}
        <div
          className={styles.tarjetaPromocionalActivaPremium} style={{ background: user.isPremium
              ? 'linear-gradient(135deg, rgba(244, 127, 255, 0.15) 0%, rgba(88, 101, 242, 0.15) 100%)'
              : 'linear-gradient(135deg, var(--brand) 0%, var(--legacy-fuchsia) 100%)', border: user.isPremium ? '1px solid rgba(244, 127, 255, 0.4)' : 'none', borderRadius: 'var(--radius-sm, 4px)' }}
        >
          <div className={styles.tarjetaPromocionalActivaPremiumDiv}>
            <div className={styles.saldoPuntosDiv}>
              <Sparkles size={16} color={user.isPremium ? '#f47fff' : '#ffffff'} />
              <span className={styles.saldoPuntosDivSpan2}>
                {user.isPremium ? 'Discordia Nitro Activo' : 'Consigue Discordia Nitro'}
              </span>
            </div>
            {!user.isPremium && onSubscribePremium && (
              <button
                type="button"
                onClick={onSubscribePremium}
                className={styles.mejorar}
              >
                Mejorar
              </button>
            )}
          </div>
          {user.isPremium && user.premiumSince && (
            <p className={styles.tarjetaPromocionalActivaPremiumP}>
              Suscriptor desde {new Date(user.premiumSince).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>

        {/* Separador */}
        <div className={styles.separador} />

        {/* Submenú de Estado de Presencia */}
        <div className={styles.submenuEstadoPresencia}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: 'var(--radius-xs, 3px)',
              cursor: 'pointer',
              color: 'var(--interactive-normal, #b5bac1)',
              fontSize: '13px',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--bg-modifier-hover, rgba(255, 255, 255, 0.06))';
              e.currentTarget.style.color = 'var(--interactive-hover, #dbdee1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--interactive-normal, #b5bac1)';
            }}
          >
            <div className={styles.submenuEstadoPresenciaDiv}>
              <span
                className={styles.submenuEstadoPresenciaDivSpan} style={{ backgroundColor:
                    STATUS_QUICK_OPTIONS.find((s) => s.id === user.status)?.color ||
                    'var(--status-online)' }}
              />
              <span>Cambiar Estado</span>
            </div>
            {showStatusMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {/* Opciones desplegables de presencia */}
          {showStatusMenu && (
            <div className={styles.submenuEstadoPresenciaDiv2}>
              {STATUS_QUICK_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (onChangeStatus) onChangeStatus(opt.id);
                    setShowStatusMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-xs, 3px)',
                    cursor: 'pointer',
                    color:
                      user.status === opt.id
                        ? 'var(--text-white, #ffffff)'
                        : 'var(--text-normal, #dbdee1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--bg-modifier-hover, rgba(255, 255, 255, 0.06))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className={styles.saldoPuntosDiv}>
                    <span
                      className={styles.saldoPuntosDivSpan3} style={{ backgroundColor: opt.color }}
                    />
                    <span>{opt.label}</span>
                  </div>
                  {user.status === opt.id && <Check size={12} color="var(--brand, #5865f2)" />}
                </div>
              ))}

              {onOpenStatusPicker && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setShowStatusMenu(false);
                    onOpenStatusPicker();
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-xs, 3px)',
                    cursor: 'pointer',
                    color: 'var(--brand, #5865f2)',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--bg-modifier-hover, rgba(255, 255, 255, 0.06))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Personalizar estado...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones de Cuenta */}
        <div className={styles.accionesCuenta}>
          {onOpenSettings && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: 'var(--radius-xs, 3px)',
                cursor: 'pointer',
                color: 'var(--interactive-normal, #b5bac1)',
                fontSize: '13px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  'var(--bg-modifier-hover, rgba(255, 255, 255, 0.06))';
                e.currentTarget.style.color = 'var(--interactive-hover, #dbdee1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--interactive-normal, #b5bac1)';
              }}
            >
              <Settings size={15} />
              <span>Ajustes de Usuario</span>
            </div>
          )}

          {onLogout && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                onLogout();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: 'var(--radius-xs, 3px)',
                cursor: 'pointer',
                color: 'var(--danger, #da373c)',
                fontSize: '13px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(218, 55, 60, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut size={15} />
              <span>Cerrar Sesión</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMiniProfile;
