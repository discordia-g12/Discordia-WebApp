import { useEffect, useState } from 'react';
import { breakpoints } from '@discordia/tokens';

/** true mientras el ancho de la ventana sea menor que `width`. */
function useViewportBelow(width: number) {
  const [below, setBelow] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < width;
  });

  useEffect(() => {
    const handler = () => setBelow(window.innerWidth < width);
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [width]);

  return below;
}

/**
 * Hook para detectar si el viewport corresponde a un dispositivo móvil (< breakpoints.mobile).
 */
export function useIsMobile() {
  return useViewportBelow(breakpoints.mobile);
}

/**
 * Escritorio compacto (de breakpoints.mobile a breakpoints.compact): la lista de miembros y los hilos se
 * abren encima del chat en vez de ocupar una columna. Por debajo de breakpoints.mobile es false: ahí se
 * usa el shell mobile, que tiene sus propias pantallas.
 */
export function useIsCompact() {
  const belowCompact = useViewportBelow(breakpoints.compact);
  const mobile = useIsMobile();
  return belowCompact && !mobile;
}
