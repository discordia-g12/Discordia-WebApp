import { useState } from 'react';
import { layout } from '@discordia/tokens';
import { initials } from './initials';
import styles from './ServerIcon.module.css';

interface ServerIconProps {
  server: { name: string; iconUrl?: string | null };
  /** sm 24 px, md 40 px, lg 80 px (o un número en px). Sin tamaño, llena su contenedor. */
  size?: keyof typeof layout.avatarSize | number;
  /**
   * Nombre accesible, solo donde el ícono es el contenido (la vista previa de Ajustes). Sin él es
   * decorativo: el nombre ya está al lado o en la etiqueta del control.
   */
  label?: string;
}

/**
 * Ícono del servidor: identifica al servidor en todo lugar donde se lo nombra (la franja, el encabezado,
 * los servidores en común). Siempre cuadrado. Sin ícono (o si no carga), las iniciales sobre un bloque
 * invertido, como el avatar.
 */
export function ServerIcon({ server, size, label }: ServerIconProps) {
  const [broken, setBroken] = useState(false);
  const px = size === undefined ? undefined : typeof size === 'number' ? size : layout.avatarSize[size];
  const style = px === undefined ? undefined : { width: px, height: px, fontSize: Math.max(9, px * 0.36) };

  return (
    <span className={`${styles.root} ${px === undefined ? styles.fill : ''}`} style={style} aria-hidden={label ? undefined : true}>
      {server.iconUrl && !broken ? (
        <img src={server.iconUrl} alt={label ?? ''} className={styles.image} onError={() => setBroken(true)} />
      ) : (
        <span className={styles.initials} role={label ? 'img' : undefined} aria-label={label}>
          {initials(server.name)}
        </span>
      )}
    </span>
  );
}
