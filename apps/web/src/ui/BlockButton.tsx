import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './BlockButton.module.css';

interface BlockButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: ReactNode;
  /** danger: acciones destructivas (el único lugar donde va el rojo). */
  tone?: 'default' | 'danger';
  /** Deshabilita el botón y muestra una línea de progreso. */
  loading?: boolean;
  onPress?: () => void;
}

/** Acción principal: bloque invertido (negro en claro) con el texto en mayúsculas y barra final. */
export function BlockButton({ children, tone = 'default', loading = false, onPress, disabled, type = 'button', className, ...rest }: BlockButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.button} ${tone === 'danger' ? styles.danger : ''} ${className ?? ''}`}
      onClick={onPress}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className={styles.label}>{children} /</span>
      {loading && <span className={styles.progress} aria-hidden="true" />}
    </button>
  );
}
