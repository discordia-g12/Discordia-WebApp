import React, { useState } from 'react';
import { Home, Plus, Compass } from 'lucide-react';
import { Server } from '../../types';

/**
 * Propiedades del componente ServerRail.
 */
export interface ServerRailProps {
  /** Colección de servidores donde el usuario es miembro. */
  servers: Server[];
  /** Identificador del servidor actualmente activo o 'home' para vista principal de mensajes directos. */
  selectedServerId: string | 'home';
  /** Manejador invocado al seleccionar un servidor o volver a inicio. */
  onSelectServer: (serverId: string | 'home') => void;
  /** Acción para desplegar el modal o flujo de creación/unión de servidor. */
  onAddServer?: () => void;
  /** Acción para explorar y descubrir nuevos servidores públicos. */
  onDiscoverServers?: () => void;
  /** Contador global opcional de menciones o mensajes directos pendientes en Home. */
  homeBadgeCount?: number;
  /** Indica si los servidores se están cargando desde el backend. */
  isLoading?: boolean;
}

/**
 * Obtiene el acrónimo representativo para un servidor sin icono gráfico.
 *
 * @param name - Nombre del servidor.
 * @returns Acrónimo de 1 a 3 caracteres en mayúsculas.
 */
function getServerAcronym(name: string): string {
  const cleanName = name.trim();
  if (!cleanName) return '?';
  const parts = cleanName.split(/\s+/);
  if (parts.length > 1) {
    return parts
      .slice(0, 3)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }
  return cleanName.slice(0, 3).toUpperCase();
}

/**
 * Barra vertical primaria de navegación de servidores (Nivel 1).
 * Implementa el carril de iconos, píldoras indicadoras laterales,
 * badges numéricos de mención y tooltips flotantes.
 */
export const ServerRail: React.FC<ServerRailProps> = ({
  servers,
  selectedServerId,
  onSelectServer,
  onAddServer,
  onDiscoverServers,
  homeBadgeCount = 0,
  isLoading = false,
}) => {
  const [tooltip, setTooltip] = useState<{ text: string; top: number } | null>(null);

  /** Muestra tooltip flotante alineado verticalmente al elemento disparador. */
  const handleMouseEnter = (text: string, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      text,
      top: rect.top + rect.height / 2,
    });
  };

  /** Oculta el tooltip flotante activo. */
  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <nav
      className="server-rail-container scrollbar-none"
      aria-label="Servidores y mensajes directos"
      style={{
        width: 'var(--server-sidebar-width, 72px)',
        height: '100%',
        backgroundColor: 'var(--bg-tertiary, #1e1f22)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        flexShrink: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Botón Home / Mensajes directos */}
      <div
        className={`server-item-wrapper ${selectedServerId === 'home' ? 'active' : ''}`}
        onMouseEnter={(e) => handleMouseEnter('Mensajes directos', e)}
        onMouseLeave={handleMouseLeave}
        onClick={() => onSelectServer('home')}
        role="button"
        tabIndex={0}
        aria-label="Mensajes directos e inicio"
      >
        <span
          className="server-pill"
          style={{
            height:
              selectedServerId === 'home'
                ? '40px'
                : homeBadgeCount > 0
                ? '8px'
                : undefined,
          }}
        />
        <div
          className={`server-item ${selectedServerId === 'home' ? 'active' : ''}`}
          style={{
            backgroundColor:
              selectedServerId === 'home' ? 'var(--brand, #5865f2)' : undefined,
            color:
              selectedServerId === 'home' ? 'var(--text-white, #ffffff)' : undefined,
          }}
        >
          <Home size={24} />
          {homeBadgeCount > 0 && (
            <span className="server-badge">
              {homeBadgeCount > 99 ? '99+' : homeBadgeCount}
            </span>
          )}
        </div>
      </div>

      {/* Separador */}
      <div className="server-separator" role="separator" />

      {/* Lista de servidores */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`sk-${i}`} className="server-item-wrapper" style={{ opacity: 0.5 }}>
              <div className="server-item" style={{ backgroundColor: 'var(--bg-modifier-hover, rgba(78, 80, 88, 0.3))' }} />
            </div>
          ))
        ) : (
          servers.map((server) => {
          const isSelected = server.id === selectedServerId;
          const hasUnread = Boolean(server.unreadCount && server.unreadCount > 0);
          const iconUrl = server.iconUrl || server.icon;

          return (
            <div
              key={server.id}
              className={`server-item-wrapper ${isSelected ? 'active' : ''}`}
              onMouseEnter={(e) => handleMouseEnter(server.name, e)}
              onMouseLeave={handleMouseLeave}
              onClick={() => onSelectServer(server.id)}
              role="button"
              tabIndex={0}
              aria-label={`Servidor ${server.name}`}
            >
              <span
                className="server-pill"
                style={{
                  height: isSelected ? '40px' : hasUnread ? '8px' : undefined,
                }}
              />
              <div className={`server-item ${isSelected ? 'active' : ''}`}>
                {iconUrl ? (
                  <img src={iconUrl} alt={server.name} />
                ) : (
                  <span>{getServerAcronym(server.name)}</span>
                )}

                {hasUnread && (
                  <span className="server-badge">
                    {(server.unreadCount ?? 0) > 99 ? '99+' : server.unreadCount}
                  </span>
                )}
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* Botón Añadir Servidor */}
      <div
        className="server-item-wrapper"
        onMouseEnter={(e) => handleMouseEnter('Añadir un servidor', e)}
        onMouseLeave={handleMouseLeave}
        onClick={onAddServer}
        role="button"
        tabIndex={0}
        aria-label="Añadir un servidor"
        style={{ marginTop: '4px' }}
      >
        <span className="server-pill" />
        <div
          className="server-item add-server-btn"
          style={{
            backgroundColor: 'var(--bg-primary, #313338)',
            color: 'var(--status-online, #23a55a)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--status-online, #23a55a)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-primary, #313338)';
            e.currentTarget.style.color = 'var(--status-online, #23a55a)';
          }}
        >
          <Plus size={22} />
        </div>
      </div>

      {/* Botón Descubrir Servidores */}
      <div
        className="server-item-wrapper"
        onMouseEnter={(e) => handleMouseEnter('Descubrir servidores públicos', e)}
        onMouseLeave={handleMouseLeave}
        onClick={onDiscoverServers}
        role="button"
        tabIndex={0}
        aria-label="Descubrir servidores públicos"
      >
        <span className="server-pill" />
        <div
          className="server-item discover-server-btn"
          style={{
            backgroundColor: 'var(--bg-primary, #313338)',
            color: 'var(--status-online, #23a55a)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--status-online, #23a55a)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-primary, #313338)';
            e.currentTarget.style.color = 'var(--status-online, #23a55a)';
          }}
        >
          <Compass size={22} />
        </div>
      </div>

      {/* Tooltip flotante posicionado con portal / fixed */}
      {tooltip && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: '84px',
            top: `${tooltip.top}px`,
            transform: 'translateY(-50%)',
            backgroundColor: 'var(--bg-floating, #111214)',
            color: 'var(--text-white, #ffffff)',
            padding: '7px 12px',
            borderRadius: 'var(--radius-sm, 4px)',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-floating, 0 8px 24px rgba(0,0,0,0.5))',
            pointerEvents: 'none',
            zIndex: 9999,
            animation: 'fadeIn 120ms ease',
          }}
        >
          {/* Flecha indicadora izquierda */}
          <span
            style={{
              position: 'absolute',
              left: '-5px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '5px solid var(--bg-floating, #111214)',
            }}
          />
          {tooltip.text}
        </div>
      )}
    </nav>
  );
};

export default ServerRail;
