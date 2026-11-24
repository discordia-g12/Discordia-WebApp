import type { ButtonHTMLAttributes, Ref } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> {
  /** Ícono de lucide (línea de 1.5, como el resto). */
  icon: LucideIcon;
  /** Nombre accesible y tooltip: el ícono solo no dice qué hace. */
  label: string;
  onPress?: () => void;
  /** Interruptor encendido (panel abierto, notificaciones silenciadas): bloque invertido, el acento de ADR-02. */
  pressed?: boolean;
  /** Cantidad chica sobre el ícono (mensajes fijados). 0 o sin valor: no se muestra. */
  badge?: number;
  /** danger: acciones destructivas (el rojo va solo en el ícono). */
  tone?: 'default' | 'danger';
  /** Para ubicar un menú debajo del botón (React 19: llega al <button> con el resto). */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Acción de un encabezado como ícono: área cuadrada de 48 px separada de la anterior por una línea fina, sin
 * radio ni sombra. El nombre va en aria-label y en el tooltip. Mismo nombre y props que en mobile.
 */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  pressed,
  badge,
  tone = 'default',
  disabled,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const count = badge && badge > 0 ? (badge > 99 ? '99+' : String(badge)) : null;
  return (
    <button
      type={type}
      className={`${styles.button} ${pressed ? styles.pressed : ''} ${tone === 'danger' ? styles.danger : ''} ${className ?? ''}`}
      onClick={onPress}
      disabled={disabled}
      aria-label={count ? `${label} (${count})` : label}
      aria-pressed={pressed}
      title={label}
      {...rest}
    >
      <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
      {count && (
        <span className={styles.badge} aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}
