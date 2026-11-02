import type { ReactNode } from 'react';
import { isFeatureReady, type BackofficeFeature } from '../features';
import styles from './Cell.module.css';

/** Aclaración de lo que todavía no funciona: el backoffice ya existe, falta su endpoint de staff. */
const SOON_NOTE = 'Todavía no está conectado a la plataforma.';

/**
 * Celda de la grilla, como las de los ajustes de la web: título con barra final y su contenido. wide ocupa
 * las dos columnas. Con una función que todavía no está lista (features.ts), lleva "próximamente" y los
 * controles quedan deshabilitados (un fieldset disabled deshabilita todo lo de adentro), así nada simula
 * guardarse.
 */
export function Cell({
  title,
  feature,
  wide = false,
  note = SOON_NOTE,
  children,
}: {
  title: string;
  /** Función del backoffice que muestra la celda. Sin ella, la celda siempre está habilitada. */
  feature?: BackofficeFeature;
  wide?: boolean;
  /** Aclaración de la parte deshabilitada. */
  note?: string;
  children: ReactNode;
}) {
  const soon = feature !== undefined && !isFeatureReady(feature);
  return (
    <section className={`${styles.cell} ${wide ? styles.wide : ''}`} aria-label={title}>
      <h2 className={styles.title}>
        {title} /{soon && <span className={styles.soonTag}>próximamente</span>}
      </h2>
      {soon ? (
        <fieldset className={styles.soon} disabled>
          <legend className={styles.soonNote}>/ {note}</legend>
          {children}
        </fieldset>
      ) : (
        <div className={styles.body}>{children}</div>
      )}
    </section>
  );
}

/** Fila con título en negrita, descripción chica y un control a la derecha. */
export function Row({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <p className={styles.rowTitle}>{title}</p>
        {description && <p className={styles.rowDescription}>{description}</p>}
      </div>
      {children && <div className={styles.rowControl}>{children}</div>}
    </div>
  );
}

/** Texto chico con barra inicial, en el gris de las bajadas. */
export function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>/ {children}</p>;
}
