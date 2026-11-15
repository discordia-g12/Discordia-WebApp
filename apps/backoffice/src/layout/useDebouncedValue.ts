import { useEffect, useState } from 'react';

/** Espera después de la última tecla antes de buscar: un pedido por búsqueda, no por letra. */
export const SEARCH_DEBOUNCE_MS = 300;

/** El valor, pero recién cuando deja de cambiar durante `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
