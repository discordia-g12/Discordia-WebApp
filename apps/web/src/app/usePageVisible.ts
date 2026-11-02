import { useEffect, useState } from 'react';

/** La pestaña está a la vista (no minimizada ni en segundo plano). */
export function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');

  useEffect(() => {
    const handler = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return visible;
}
