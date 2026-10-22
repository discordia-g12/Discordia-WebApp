import { useEffect, useState } from 'react';

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
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: offline ? 'var(--status-danger, #ed4245)' : 'var(--status-online, #23a55a)',
        color: '#ffffff',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 600,
        zIndex: 9999,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
      }}
    >
      {offline ? '⚠️ Conexión perdida — Intentando reconectar...' : '✓ Conexión restablecida'}
    </div>
  );
}
