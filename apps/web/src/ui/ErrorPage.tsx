import type { ReactNode } from 'react';
import { DisplayText } from './DisplayText';
import { Logo } from './Logo';
import styles from './ErrorPage.module.css';

interface ErrorPageProps {
  /** Código chico arriba del texto ("404"). Sin código: un error de la interfaz. */
  code?: string;
  /** La palabra gigante al pie ("Página no encontrada"). También es el título de la página. */
  title: string;
  /** Qué pasó y qué hacer, en una o dos oraciones. */
  message: ReactNode;
  /** Detalle técnico chico, con barra inicial (solo en desarrollo, por ejemplo). */
  detail?: string;
  /** Marca al pie: "discordia/" en la web, "discordia/ staff" en el backoffice. */
  brand?: string;
  /** Las acciones: el bloque negro y, si hace falta, una secundaria. */
  children?: ReactNode;
}

/**
 * Página de error del rediseño, la misma composición que el acceso: el resplandor de fondo, el texto en la
 * columna izquierda y la palabra gigante al pie. Ocupa toda la pantalla y no depende de la sesión ni de los
 * datos, así se puede mostrar cuando el resto de la app no anda. La usan la web y el backoffice.
 */
export function ErrorPage({ code, title, message, detail, brand = 'discordia/', children }: ErrorPageProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.glow} aria-hidden="true" />
      <main className={styles.column}>
        <div className={styles.panel}>
          {code && <p className={styles.code}>error {code}/</p>}
          <p className={styles.message}>{message}</p>
          {detail && <p className={styles.detail}>/ {detail}</p>}
          {children && <div className={styles.actions}>{children}</div>}
        </div>
        <header className={styles.heading}>
          <p className={styles.brand}>
            <Logo size={20} />
            <span>{brand}</span>
          </p>
          <h1 className={styles.title}>
            <DisplayText active>{title}</DisplayText>
          </h1>
        </header>
      </main>
    </div>
  );
}
