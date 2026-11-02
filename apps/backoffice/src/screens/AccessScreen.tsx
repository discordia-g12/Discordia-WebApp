import { BlockButton, DisplayText, Logo } from '@web/ui';
import { login, logout, retrySession, useBackofficeSession } from '../auth/session';
import { config } from '../config';
import { ExternalLink } from '../layout/blocks';
import styles from './AccessScreen.module.css';

/**
 * Todo lo que se ve antes del backoffice: verificando la sesión, sin sesión (entrar), sin permiso (la
 * cuenta no es staff) y error (con reintentar). Cada estado dice qué hacer, como pide la consigna para la
 * capa de presentación.
 */
export function AccessScreen() {
  const { status, error } = useBackofficeSession();

  return (
    <main className={styles.screen}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <Logo size={28} />
          <span className={styles.brandName}>discordia/</span>
        </div>
        <DisplayText active>Backoffice</DisplayText>

        {status === 'loading' && (
          <p className={styles.text} role="status">
            verificando tu sesión/
          </p>
        )}

        {status === 'signed_out' && (
          <>
            <p className={styles.text}>Administración de la plataforma. Solo para el staff de Discordia.</p>
            <div className={styles.actions}>
              <BlockButton size="large" onPress={() => void login()}>
                Entrar
              </BlockButton>
            </div>
          </>
        )}

        {status === 'forbidden' && (
          <>
            <div className={styles.alert} role="alert">
              <p className={styles.alertTitle}>Esta cuenta no es staff de la plataforma.</p>
              <p className={styles.text}>
                / El rol se asigna por fuera de la app (app_metadata.role = &quot;staff&quot; en Auth0). Si te lo acaban de dar,
                salí y volvé a entrar.
              </p>
            </div>
            <div className={styles.actions}>
              <BlockButton onPress={() => void logout()}>Entrar con otra cuenta</BlockButton>
              <ExternalLink href={config.appUrl}>ir a Discordia</ExternalLink>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.alert} role="alert">
              <p className={styles.alertTitle}>No pudimos verificar tu sesión.</p>
              <p className={styles.text}>/ {error}</p>
            </div>
            <div className={styles.actions}>
              <BlockButton onPress={() => void retrySession()}>Reintentar</BlockButton>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
