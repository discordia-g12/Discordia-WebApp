import { useEffect, useState } from 'react';
import { breakpoints } from '@discordia/tokens';

/**
 * Hook para detectar si el viewport corresponde a un dispositivo móvil (< breakpoints.mobile).
 */
export function useIsMobile() {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoints.mobile;
  });

  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < breakpoints.mobile);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return mobile;
}
