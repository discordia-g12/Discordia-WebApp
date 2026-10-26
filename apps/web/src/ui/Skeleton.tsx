import styles from './Skeleton.module.css';

interface SkeletonProps {
  /** Cantidad de líneas. */
  lines?: number;
  /** Nombre accesible de lo que está cargando. */
  label?: string;
}

// Anchos que se repiten para que las líneas no queden todas iguales
const WIDTHS = ['92%', '64%', '78%', '48%', '85%', '57%'];

/** Carga: barras horizontales finas que laten, nunca un spinner sobre fondo vacío. */
export function Skeleton({ lines = 3, label = 'Cargando' }: SkeletonProps) {
  return (
    <div className={styles.root} role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={styles.line} style={{ width: WIDTHS[i % WIDTHS.length], animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}
