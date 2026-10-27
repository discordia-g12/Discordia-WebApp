import { Compass, Home, Plus, type LucideIcon } from 'lucide-react';
import type { Server } from '../../types';
import { Logo, ServerStrip, Skeleton } from '../../ui';
import { serverUnreadLabel } from './unread';
import styles from './ServerRail.module.css';

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
 * Rail del rediseño (PDF, págs. 6 a 8): el logo arriba, los servidores como franjas de imagen (al pasar
 * el mouse se despliega la etiqueta negra con el nombre y la actividad) y abajo inicio, crear y
 * explorar. Misma API que el rail anterior.
 */
export function ServerRail({
  servers,
  selectedServerId,
  onSelectServer,
  onAddServer,
  onDiscoverServers,
  homeBadgeCount = 0,
  isLoading = false,
}: ServerRailProps) {
  const isHome = selectedServerId === 'home';

  return (
    <nav className={styles.rail} aria-label="Servidores y mensajes directos">
      <div className={styles.logo}>
        <Logo size={22} />
      </div>

      <ul className={styles.strips} aria-busy={isLoading || undefined}>
        {isLoading ? (
          <li className={styles.loading}>
            <Skeleton lines={3} />
          </li>
        ) : (
          servers.map((server) => (
            <li key={server.id}>
              <ServerStrip
                server={server}
                active={server.id === selectedServerId}
                unread={serverUnreadLabel(server)}
                onPress={() => onSelectServer(server.id)}
              />
            </li>
          ))
        )}
      </ul>

      <div className={styles.actions}>
        <RailAction
          icon={Home}
          label="Mensajes directos"
          active={isHome}
          badge={homeBadgeCount > 0}
          onPress={() => onSelectServer('home')}
        />
        <RailAction icon={Plus} label="Añadir un servidor" onPress={onAddServer} />
        <RailAction icon={Compass} label="Descubrir servidores" onPress={onDiscoverServers} />
      </div>
    </nav>
  );
}

/** Acción al pie del rail: ícono de línea fina, con la misma etiqueta negra que las franjas al pasar el mouse. */
function RailAction({
  icon: Icon,
  label,
  active = false,
  badge = false,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: boolean;
  onPress?: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.action} ${active ? styles.actionActive : ''}`}
      onClick={onPress}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      data-label={label}
    >
      <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
      {badge && <span className={styles.badge} aria-hidden="true" />}
    </button>
  );
}
