import { useEffect, useId, useRef, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { useMotionPreset } from './motion';
import styles from './Modal.module.css';

interface ModalProps {
  /** Título en display gigante a la izquierda ("Crear servidor"); también es el nombre del diálogo. */
  title: string;
  /** Bajada chica bajo el título, con barra inicial. */
  description?: ReactNode;
  onClose: () => void;
  /** alertdialog: confirmaciones de acciones que no se pueden deshacer. */
  role?: 'dialog' | 'alertdialog';
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal del rediseño (docs/TODO-REDISENO.md, sección 3): panel a todo el ancho que baja desde arriba
 * como una cortina y ocupa ~60% del alto, con el título en display a la izquierda (a la altura de la
 * barra lateral) y el contenido a la derecha. Se cierra con la ×, con Escape o tocando afuera; el foco
 * queda adentro mientras está abierto y vuelve a donde estaba al cerrarse. La salida animada necesita
 * AnimatePresence afuera.
 */
export function Modal({ title, description, onClose, role = 'dialog', children }: ModalProps) {
  const curtain = useMotionPreset('curtain');
  const fade = useMotionPreset('fade');
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Si un campo ya tomó el foco (autoFocus) se respeta; si no, el primer control del contenido
    if (panel && !panel.contains(document.activeElement)) {
      const first = panel.querySelector<HTMLElement>(`.${styles.body} :is(${FOCUSABLE})`);
      (first ?? panel).focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  // Tab y Shift+Tab dan la vuelta adentro del panel
  const trapFocus = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusables = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <motion.div className={styles.scrim} onClick={onClose} aria-hidden="true" {...fade} />
      <motion.div
        ref={panelRef}
        className={styles.panel}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
        {...curtain}
      >
        <header className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description && <p className={styles.description}>/ {description}</p>}
        </header>

        <div className={styles.body}>{children}</div>

        <button type="button" className={styles.close} onClick={onClose} aria-label={`Cerrar: ${title}`} title="Cerrar (Esc)">
          <X size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </motion.div>
    </>
  );
}

/** Pie del modal: la acción secundaria (_cancelar) y la principal (bloque negro), a la derecha. */
export function ModalActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

/** Formulario que llena el contenido del modal: campos uno debajo del otro y ModalActions al pie. */
export function ModalForm({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  return (
    <form
      className={styles.form}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}
