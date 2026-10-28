// Backoffice de administración de la plataforma (prototipo), compartido por web y mobile: tipos, opciones
// y datos de ejemplo. Todavía no hay endpoints de staff: los listados muestran estas filas de muestra y nada
// sale del cliente. Cuando existan, acá van los hooks de React Query, como en admin/members.ts.

export type BackofficeSection = 'users' | 'servers' | 'investigation';

export type AccountState = 'active' | 'suspended';

export type AccountStateFilter = 'all' | AccountState;

export type InvestigationTarget = 'user' | 'server';

export interface BackofficeUserRow {
  id: string;
  displayName: string;
  username: string;
  email: string;
  state: AccountState;
  /** Fecha de alta (ISO, solo día). */
  createdAt: string;
  reports: number;
}

export interface BackofficeServerRow {
  id: string;
  name: string;
  owner: string;
  members: number;
  state: AccountState;
  createdAt: string;
  reports: number;
}

export interface CaseEvent {
  date: string;
  text: string;
}

export const BACKOFFICE_SECTIONS: { id: BackofficeSection; label: string; items: string[] }[] = [
  { id: 'users', label: 'Usuarios', items: ['Listado con filtros', 'Suspender usuario', 'Reactivar usuario'] },
  { id: 'servers', label: 'Servidores', items: ['Listado de servidores', 'Suspender servidor', 'Eliminar servidor'] },
  { id: 'investigation', label: 'Investigación', items: ['Buscar expediente', 'Expediente de usuario o servidor'] },
];

/** Aclaración de las celdas: no es que "no se guarda", es que el backoffice todavía no tiene backend. */
export const BACKOFFICE_SOON_NOTE = 'El backoffice todavía no está conectado a la plataforma.';

export const ACCOUNT_STATE_OPTIONS: { value: AccountStateFilter; label: string }[] = [
  { value: 'all', label: 'todos' },
  { value: 'active', label: 'activos' },
  { value: 'suspended', label: 'suspendidos' },
];

export const INVESTIGATION_TARGET_OPTIONS: { value: InvestigationTarget; label: string }[] = [
  { value: 'user', label: 'usuario' },
  { value: 'server', label: 'servidor' },
];

export const SUSPENSION_DURATIONS = ['24 horas', '7 días', '30 días', 'indefinida'];

export const ACCOUNT_STATE_LABEL: Record<AccountState, string> = {
  active: 'activo',
  suspended: 'suspendido',
};

export const SAMPLE_PLATFORM_USERS: BackofficeUserRow[] = [
  { id: 'pu1', displayName: 'Sofía Ríos', username: 'sofi', email: 'sofi@mail.com', state: 'active', createdAt: '2026-03-12', reports: 0 },
  { id: 'pu2', displayName: 'Tomás Vera', username: 'tomasv', email: 'tomas@mail.com', state: 'suspended', createdAt: '2026-05-02', reports: 4 },
  { id: 'pu3', displayName: 'Lucía Paz', username: 'lupaz', email: 'lucia@mail.com', state: 'active', createdAt: '2026-06-21', reports: 1 },
  { id: 'pu4', displayName: 'Martín Gil', username: 'mgil', email: 'martin@mail.com', state: 'active', createdAt: '2026-08-08', reports: 0 },
];

export const SAMPLE_PLATFORM_SERVERS: BackofficeServerRow[] = [
  { id: 'ps1', name: 'Estudio IS2', owner: 'sofi', members: 34, state: 'active', createdAt: '2026-03-15', reports: 0 },
  { id: 'ps2', name: 'Gaming Nocturno', owner: 'tomasv', members: 212, state: 'suspended', createdAt: '2026-04-30', reports: 7 },
  { id: 'ps3', name: 'Club de Lectura', owner: 'lupaz', members: 18, state: 'active', createdAt: '2026-07-02', reports: 0 },
];

/** Expediente de ejemplo (Tomás Vera). */
export const SAMPLE_CASE: { subject: BackofficeUserRow; stats: { reports: number; sanctions: number; servers: number }; events: CaseEvent[] } = {
  subject: SAMPLE_PLATFORM_USERS[1],
  stats: { reports: 4, sanctions: 2, servers: 3 },
  events: [
    { date: '2026-10-20', text: 'reporte de spam en #general (Gaming Nocturno)' },
    { date: '2026-10-22', text: 'baneado por moderación del servidor' },
    { date: '2026-10-24', text: 'suspendido por la plataforma: 7 días' },
  ],
};

/** Usuarios que coinciden con la búsqueda (nombre, @usuario o email) y el filtro de estado. */
export function filterPlatformUsers(users: BackofficeUserRow[], search: string, state: AccountStateFilter): BackofficeUserRow[] {
  const q = search.trim().toLowerCase();
  return users.filter(
    (u) => (state === 'all' || u.state === state) && (!q || [u.displayName, u.username, u.email].some((v) => v.toLowerCase().includes(q)))
  );
}

/** Servidores que coinciden con la búsqueda (nombre o dueña/o). */
export function filterPlatformServers(servers: BackofficeServerRow[], search: string): BackofficeServerRow[] {
  const q = search.trim().toLowerCase();
  return servers.filter((s) => !q || s.name.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q));
}

/** "2026-10-20" → "20/10/2026", sin correrse de día por la zona horaria. */
export function formatBackofficeDate(isoDay: string): string {
  return new Date(`${isoDay}T00:00:00`).toLocaleDateString('es-AR');
}
