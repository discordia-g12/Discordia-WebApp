import type { ToastType } from '../app/uiStore';
import styles from './Toast.module.css';

/**
 * Componente Toast para avisos flotantes efímeros.
 */
export function ToastNotification({
  message,
  type = 'info',
}: {
  message: string;
  type?: ToastType;
}) {
  const bg =
    type === 'success' ? '#23a55a' : type === 'danger' ? '#ed4245' : 'var(--brand-blurple, #5865f2)';

  return (
    <div
      className={styles.root} style={{ backgroundColor: bg }}
    >
      {message}
    </div>
  );
}
