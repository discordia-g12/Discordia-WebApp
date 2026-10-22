import React, { useState } from 'react';
import { User, Status } from '../types';
import styles from './Avatar.module.css';

/**
 * Propiedades del componente Avatar.
 */
export interface AvatarProps {
  /** Entidad de usuario asociada al avatar. */
  user: User;
  /** Tamaño en píxeles del diámetro del avatar. Por defecto 40. */
  size?: number;
  /** Indica si se debe renderizar el punto de presencia. Por defecto false. */
  showStatus?: boolean;
  /** Color de fondo del borde del punto de presencia para mimetizarse con el contenedor. */
  statusBg?: string;
  /** Callback al hacer click sobre el avatar. */
  onClick?: () => void;
  /** Activa el efecto de halo verde pulsante cuando el usuario emite voz. */
  speaking?: boolean;
}

/** Paleta cromática de reserva para avatares basados en iniciales. */
const FALLBACK_COLORS = [
  '#5865f2', // Blurple
  '#57f287', // Verde menta
  '#fee75c', // Amarillo
  '#eb459e', // Fucsia
  '#ed4245', // Rojo
  '#3ba55d', // Verde esmeralda
  '#faa81a', // Ámbar
  '#23a55a', // Verde Discordia
];

/**
 * Obtiene las iniciales representativas del usuario (1 o 2 letras mayúsculas).
 *
 * @param user - Objeto de usuario.
 * @returns Cadena con una o dos iniciales en mayúscula.
 */
function getInitials(user: User): string {
  const name = (user.displayName || user.username || '').trim();
  if (!name) return '?';
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Genera un color consistente basado en el identificador o nombre del usuario.
 *
 * @param key - Cadena de entrada para la función hash simple.
 * @returns Código hexadecimal del color.
 */
function getDeterministicColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[index];
}

/**
 * Mapea el estado del usuario a su clase CSS correspondiente.
 *
 * @param status - Estado del usuario.
 * @returns Nombre de la clase modificadora de estado.
 */
function getStatusClass(status?: Status): string {
  switch (status) {
    case 'online':
      return 'online';
    case 'idle':
      return 'idle';
    case 'dnd':
      return 'dnd';
    case 'invisible':
    case 'offline':
    default:
      return 'offline';
  }
}

/**
 * Componente Avatar para Discordia.
 * Renderiza la imagen del usuario o sus iniciales estilizadas,
 * acompañado de un punto de presencia e indicador de voz activa.
 */
export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 40,
  showStatus = false,
  statusBg = 'var(--bg-secondary)',
  onClick,
  speaking = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const avatarSrc = user.avatarUrl || user.avatar;
  const hasValidImage = Boolean(avatarSrc) && !imageError;
  const initials = getInitials(user);
  const bgColor = user.bannerColor || getDeterministicColor(user.id || user.username);

  // Dimensiones escaladas del punto de presencia
  const dotSize = Math.max(8, Math.round(size * 0.28));
  const dotBorderWidth = Math.max(2, Math.round(size * 0.06));

  const statusClass = getStatusClass(user.status);

  return (
    <div
      className="avatar-container"
      onClick={onClick}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 'var(--radius-full)',
        boxShadow: speaking
          ? '0 0 0 2px var(--status-online), 0 0 8px rgba(35, 165, 90, 0.7)'
          : undefined,
        transition: 'box-shadow 150ms ease, transform 150ms ease',
      }}
      title={user.displayName || user.username}
    >
      {hasValidImage ? (
        <img
          src={avatarSrc}
          alt={user.displayName || user.username}
          onError={() => setImageError(true)}
          className={styles.img}
        />
      ) : (
        <div
          className={styles.div} style={{ backgroundColor: bgColor, fontSize: `${Math.max(10, Math.round(size * 0.38))}px` }}
        >
          {initials}
        </div>
      )}

      {showStatus && (
        <span
          className={`status-dot ${statusClass}`}
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: 'var(--radius-full)',
            border: `${dotBorderWidth}px solid ${statusBg}`,
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
          aria-label={`Estado: ${user.status}`}
        />
      )}
    </div>
  );
};

export default Avatar;
