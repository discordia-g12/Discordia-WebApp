import { useEffect, useSyncExternalStore } from 'react';

/**
 * Secciones del backoffice, cada una con su URL (backoffice.discordia.lol/usuarios, /servidores...): se
 * puede recargar o compartir el link. Sin librería de rutas: son seis rutas planas, con pushState y
 * popstate (atrás y adelante del navegador). Pages y nginx devuelven index.html para cualquier ruta.
 */

export type SectionId = 'usuarios' | 'servidores' | 'expedientes' | 'metricas' | 'estado' | 'observabilidad';

export interface Section {
  id: SectionId;
  /** Palabra del menú gigante. */
  label: string;
  /** Lo que hay adentro: índice chico arriba a la izquierda y búsqueda del menú. */
  items: string[];
}

// Las historias de la consigna (épicas 10. Administración y 11. Métricas) que son de staff
export const SECTIONS: Section[] = [
  { id: 'usuarios', label: 'Usuarios', items: ['Listado con filtros', 'Suspender usuario', 'Reactivar usuario'] },
  { id: 'servidores', label: 'Servidores', items: ['Listado de servidores', 'Suspender servidor', 'Eliminar servidor'] },
  { id: 'expedientes', label: 'Expedientes', items: ['Expediente de usuario', 'Expediente de servidor'] },
  { id: 'metricas', label: 'Métricas', items: ['Usuarios activos', 'Servidores creados', 'Mensajes enviados'] },
  { id: 'estado', label: 'Estado', items: ['Estado de los servicios', 'Publicar incidente', 'Resolver incidente'] },
  { id: 'observabilidad', label: 'Observabilidad', items: ['Grafana', 'Recursos por servicio'] },
];

export const DEFAULT_SECTION: SectionId = 'usuarios';

const SECTION_IDS = new Set<string>(SECTIONS.map((s) => s.id));

/** "/servidores" o "/servidores/123" → "servidores". Cualquier otra ruta → null. */
export function sectionFromPath(pathname: string): SectionId | null {
  const first = pathname.split('/').filter(Boolean)[0] ?? '';
  return SECTION_IDS.has(first) ? (first as SectionId) : null;
}

export function pathForSection(id: SectionId): string {
  return `/${id}`;
}

const NAVIGATE_EVENT = 'backoffice:navigate';

export function navigate(path: string, { replace = false }: { replace?: boolean } = {}): void {
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

const isRoot = (pathname: string) => pathname.replace(/\/+$/, '') === '';

/**
 * Sección de la URL y cómo ir a otra. "/" se reemplaza por la de usuarios. Cualquier otra ruta desconocida
 * es null: el backoffice muestra "página no encontrada" (antes también iba a usuarios, y un link roto no se
 * notaba).
 */
export function useSection(): [SectionId | null, (id: SectionId) => void] {
  const pathname = usePathname();
  const section = sectionFromPath(pathname);
  const root = isRoot(pathname);

  useEffect(() => {
    if (!section && root) navigate(pathForSection(DEFAULT_SECTION), { replace: true });
  }, [section, root]);

  return [section ?? (root ? DEFAULT_SECTION : null), (id) => navigate(pathForSection(id))];
}
