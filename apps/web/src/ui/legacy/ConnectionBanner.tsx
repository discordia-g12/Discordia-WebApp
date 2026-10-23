import { useEffect, useState } from 'react';
import styles from './ConnectionBanner.module.css';

/**
 * Banner flotante de conectividad (offline / restablecido).
 */
export function ConnectionBanner() {
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => {
      setOffline(false);
      setReconnected(true);
      const timer = setTimeout(() => setReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!offline && !reconnected) return null;

  return (
    <div
      className={styles.root} style={{ backgroundColor: offline ? 'var(--status-danger, #ed4245)' : 'var(--status-online, #23a55a)' }}
    >
      {offline ? '⚠️ Conexión perdida — Intentando reconectar...' : '✓ Conexión restablecida'}
    </div>
  );
}
