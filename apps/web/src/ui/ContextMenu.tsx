import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import styles from './ContextMenu.module.css';

const VIEWPORT_MARGIN = 8;

export interface ContextMenuProps {
  /** Posición del click derecho (coordenadas de viewport). */
  x: number;
  y: number;
  /** Nombre del menú para lectores de pantalla. */
  label: string;
  /** Línea de arriba, en gris ("Notificaciones"). */
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Menú contextual (click derecho): panel de línea fina en la posición del click. Si no entra a la derecha o
 * abajo se abre hacia el otro lado. Se cierra con click afuera, Escape, scroll o al perder el foco la ventana.
 * Al abrirse lleva el foco al ítem marcado (o al primero), para que también se use con el teclado.
 */
export function ContextMenu({ x, y, label, title, onClose, children }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    setPosition({
      left: x + width > window.innerWidth - VIEWPORT_MARGIN ? Math.max(VIEWPORT_MARGIN, x - width) : x,
      top: y + height > window.innerHeight - VIEWPORT_MARGIN ? Math.max(VIEWPORT_MARGIN, y - height) : y,
    });
  }, [x, y]);

  useEffect(() => {
    const menu = menuRef.current;
    const target = menu?.querySelector<HTMLElement>('[aria-checked="true"]') ?? menu?.querySelector<HTMLElement>('[role^="menuitem"]');
    target?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      role="menu"
      aria-label={label}
      style={{ top: position.top, left: position.left }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {title && (
        <span className={styles.title} role="presentation">
          {title}
        </span>
      )}
      {children}
    </div>
  );
}

export interface ContextMenuItemProps {
  /** menuitemcheckbox / menuitemradio llevan `checked`. */
  role?: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';
  checked?: boolean;
  /** Texto en gris a la derecha ("Solo menciones"). */
  detail?: string;
  icon?: ReactNode;
  onPress: () => void;
  children: ReactNode;
}

export function ContextMenuItem({ role = 'menuitem', checked, detail, icon, onPress, children }: ContextMenuItemProps) {
  return (
    <button
      type="button"
      className={styles.item}
      role={role}
      aria-checked={role === 'menuitem' ? undefined : Boolean(checked)}
      onClick={onPress}
    >
      <span>{children}</span>
      {detail && <span className={styles.detail}>{detail}</span>}
      {icon}
    </button>
  );
}
