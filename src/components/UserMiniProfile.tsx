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
import { User, Status } from '../types';
import { Avatar } from './Avatar';

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
      style={{
        position: 'fixed',
        bottom: anchorPosition.bottom !== undefined ? `${anchorPosition.bottom}px` : undefined,
        left: anchorPosition.left !== undefined ? `${anchorPosition.left}px` : undefined,
        top: anchorPosition.top !== undefined ? `${anchorPosition.top}px` : undefined,
        right: anchorPosition.right !== undefined ? `${anchorPosition.right}px` : undefined,
        width: '320px',
        backgroundColor: 'var(--bg-floating, #111214)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: 'var(--shadow-floating, 0 12px 32px rgba(0, 0, 0, 0.65))',
        overflow: 'hidden',
        zIndex: 9990,
        animation: 'slideUp 150ms ease',
        userSelect: 'none',
      }}
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
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              border: 'none',
              color: 'var(--text-white, #ffffff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 150ms ease',
            }}
            title="Editar perfil"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* Contenedor principal de cuerpo */}
      <div style={{ padding: '0 16px 16px 16px', position: 'relative' }}>
        {/* Avatar superpuesto con anillo protector */}
        <div
          style={{
            marginTop: '-38px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              borderRadius: 'var(--radius-full)',
              border: '5px solid var(--bg-floating, #111214)',
              backgroundColor: 'var(--bg-floating, #111214)',
              display: 'inline-block',
            }}
          >
            <Avatar
              user={user}
              size={68}
              showStatus={true}
              statusBg="var(--bg-floating, #111214)"
            />
          </div>

          {/* Badges de usuario */}
          {user.badges && user.badges.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '4px',
                backgroundColor: 'var(--bg-secondary, #2b2d31)',
                padding: '4px 6px',
                borderRadius: 'var(--radius-sm, 4px)',
                marginBottom: '4px',
              }}
            >
              {user.badges.map((badge) => (
                <span
                  key={badge}
                  title={badge}
                  style={{
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'default',
                  }}
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
        <div style={{ marginBottom: '10px' }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--header-primary, #f2f3f5)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {user.displayName}
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-muted, #949ba4)',
              margin: '2px 0 0 0',
            }}
          >
            @{user.username}
            {user.discriminator ? `#${user.discriminator}` : ''}
          </p>
        </div>

        {/* Bocadillo con estado personalizado */}
        {user.customStatus && (
          <div
            style={{
              backgroundColor: 'var(--bg-secondary, #2b2d31)',
              borderRadius: 'var(--radius-sm, 4px)',
              padding: '8px 10px',
              fontSize: '12px',
              color: 'var(--text-normal, #dbdee1)',
              marginBottom: '12px',
              borderLeft: '3px solid var(--brand, #5865f2)',
              wordBreak: 'break-word',
            }}
          >
            <span>{user.customStatus}</span>
          </div>
        )}

        {/* Saldo de Puntos 💠 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-secondary, #2b2d31)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm, 4px)',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px' }}>💠</span>
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted, #949ba4)',
                }}
              >
                Puntos Discordia
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--header-primary, #f2f3f5)',
                }}
              >
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
          style={{
            background: user.isPremium
              ? 'linear-gradient(135deg, rgba(244, 127, 255, 0.15) 0%, rgba(88, 101, 242, 0.15) 100%)'
              : 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)',
            border: user.isPremium ? '1px solid rgba(244, 127, 255, 0.4)' : 'none',
            borderRadius: 'var(--radius-sm, 4px)',
            padding: '10px 12px',
            marginBottom: '12px',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color={user.isPremium ? '#f47fff' : '#ffffff'} />
              <span style={{ fontSize: '12px', fontWeight: 700 }}>
                {user.isPremium ? 'Discordia Nitro Activo' : 'Consigue Discordia Nitro'}
              </span>
            </div>
            {!user.isPremium && onSubscribePremium && (
              <button
                type="button"
                onClick={onSubscribePremium}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#111214',
                  border: 'none',
                  borderRadius: 'var(--radius-xs, 3px)',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Mejorar
              </button>
            )}
          </div>
          {user.isPremium && user.premiumSince && (
            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-muted, #949ba4)',
                margin: '4px 0 0 0',
              }}
            >
              Suscriptor desde {new Date(user.premiumSince).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>

        {/* Separador */}
        <div
          style={{
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            margin: '8px 0',
          }}
        />

        {/* Submenú de Estado de Presencia */}
        <div style={{ marginBottom: '4px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor:
                    STATUS_QUICK_OPTIONS.find((s) => s.id === user.status)?.color ||
                    'var(--status-online)',
                }}
              />
              <span>Cambiar Estado</span>
            </div>
            {showStatusMenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {/* Opciones desplegables de presencia */}
          {showStatusMenu && (
            <div
              style={{
                marginLeft: '12px',
                marginTop: '4px',
                paddingLeft: '6px',
                borderLeft: '2px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: opt.color,
                      }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
