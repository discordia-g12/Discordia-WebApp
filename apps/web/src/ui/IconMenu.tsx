import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Ellipsis, type LucideIcon } from 'lucide-react';
import { IconButton } from './IconButton';
import styles from './IconMenu.module.css';

export interface IconMenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
  /** danger: acciones destructivas (eliminar, bloquear). */
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onPress: () => void;
}

export interface IconMenuProps {
  items: IconMenuItem[];
  /** Nombre del botón que lo abre. */
  label?: string;
  icon?: LucideIcon;
}

/**
 * Menú "más" de un encabezado: un IconButton (puntos suspensivos) que abre un panel de línea fina con ítems de
 * ícono y texto, como el menú de un participante de voz. Se maneja con el teclado (flechas, Inicio, Fin,
 * Escape) y se cierra con click afuera o al elegir. Sin ítems no se muestra.
 */
export function IconMenu({ items, label = 'Más opciones', icon = Ellipsis }: IconMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const triggerButton = () => rootRef.current?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]');
  const menuItems = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerButton()?.focus();
  };

  useEffect(() => {
    if (!open) return;
    menuItems()[0]?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (items.length === 0) return null;

  const onKeyDown = (event: KeyboardEvent) => {
    const all = menuItems();
    const index = all.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => all[(to + all.length) % all.length]?.focus();
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        move(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        move(0);
        break;
      case 'End':
        event.preventDefault();
        move(all.length - 1);
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <IconButton
        icon={icon}
        label={label}
        onPress={() => setOpen((v) => !v)}
        pressed={open}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      />
      {open && (
        <div ref={menuRef} id={menuId} className={styles.menu} role="menu" aria-label={label} onKeyDown={onKeyDown}>
          {items.map(({ id, icon: Icon, label: itemLabel, tone, disabled, onPress }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              className={`${styles.item} ${tone === 'danger' ? styles.danger : ''}`}
              disabled={disabled}
              onClick={() => {
                close();
                onPress();
              }}
            >
              <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>{itemLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
