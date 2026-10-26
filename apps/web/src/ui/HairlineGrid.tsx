import type { CSSProperties, ReactNode } from 'react';
import styles from './HairlineGrid.module.css';

interface HairlineGridProps {
  children: ReactNode;
  /** Columnas, como grid-template-columns ("1fr 1fr", "var(--layout-sidebar-width) 1fr"). */
  columns?: string;
  className?: string;
}

/**
 * Grilla de celdas separadas por líneas de 1 px (ajustes, columnas del inicio). Las líneas son bordes
 * de las celdas, así el degradé del fondo se ve a través.
 */
export function HairlineGrid({ children, columns = '1fr', className }: HairlineGridProps) {
  return (
    <div className={`${styles.grid} ${className ?? ''}`} style={{ '--grid-columns': columns } as CSSProperties}>
      {children}
    </div>
  );
}
