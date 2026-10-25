import styles from './EmptyState.module.css';

interface EmptyStateProps {
  /** "por ahora todo está tranquilo" */
  title: string;
  /** "cuando un amigo empiece una actividad aparecerá aquí": se muestra con barra inicial. */
  hint?: string;
}

/** Estado vacío: título en negrita y una bajada chica con barra inicial (PDF, pág. 6). */
export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      <p className={styles.title}>{title}</p>
      {hint && <p className={styles.hint}>/ {hint}</p>}
    </div>
  );
}
