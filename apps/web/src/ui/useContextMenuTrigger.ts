import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

/** Cuánto hay que mantener apretado en táctil para abrir el menú. */
export const LONG_PRESS_MS = 500;
/** Si el dedo se mueve más que esto es scroll, no long-press. */
const LONG_PRESS_SLOP = 10;

/**
 * Cómo se abre un menú contextual sobre un elemento: click derecho, long-press en táctil (en iOS no hay
 * click derecho) y la tecla Menú o Shift+F10. Se esparce sobre el elemento: `<button {...trigger}>`. Sin
 * `onOpen` no hace nada.
 */
export function useContextMenuTrigger(onOpen?: (x: number, y: number) => void) {
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const cancel = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  useEffect(() => cancel, []);

  if (!onOpen) return {};
  return {
    onContextMenu: (e: ReactMouseEvent) => {
      e.preventDefault();
      cancel();
      onOpen(e.clientX, e.clientY);
    },
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
      e.preventDefault();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      onOpen(rect.left, rect.bottom);
    },
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse') return;
      cancel();
      const { clientX: x, clientY: y } = e;
      const timer = window.setTimeout(() => {
        press.current = null;
        // Al soltar no tiene que contar como tap (abriría el servidor, el canal o el DM)
        const swallow = (click: Event) => {
          click.preventDefault();
          click.stopPropagation();
        };
        window.addEventListener('click', swallow, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 700);
        onOpen(x, y);
      }, LONG_PRESS_MS);
      press.current = { timer, x, y };
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const start = press.current;
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > LONG_PRESS_SLOP) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
  };
}
