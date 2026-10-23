import type { ReactNode } from 'react';
import styles from './SectionLabel.module.css';

interface SectionLabelProps {
  children: ReactNode;
  /** Muestra la "v" para colapsar la sección (categorías de canales). */
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}

/**
 * Título de sección con barra final ("CANAL DE TEXTO /"), cruzado por la línea de la grilla.
 */
export function SectionLabel({ children, collapsible = false, open = true, onToggle }: SectionLabelProps) {
  const label = (
    <>
      <span className={styles.text}>{children} /</span>
      {collapsible && (
        <span className={`${styles.chevron} ${open ? '' : styles.closed}`} aria-hidden="true">
          v
        </span>
      )}
    </>
  );

  return (
    <div className={styles.root}>
      <span className={styles.line} aria-hidden="true" />
      {collapsible ? (
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={onToggle}>
          {label}
        </button>
      ) : (
        <h3 className={styles.heading}>{label}</h3>
      )}
    </div>
  );
}
