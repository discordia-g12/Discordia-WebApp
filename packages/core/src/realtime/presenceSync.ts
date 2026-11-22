/**
 * Lo que el inbox le cuenta a Chat-Engine sobre la presencia: a quién se está mostrando (cada usePresenceQuery
 * anota sus ids mientras está montado) y si el usuario está sin actividad (lo decide cada app). El socket lo
 * lee al conectarse y cada vez que cambia.
 */

/** Máximo de ids que acepta PRESENCE_SUBSCRIBE. Lo que sobra queda con el polling. */
export const MAX_WATCHED_USERS = 500;

const watched = new Map<string, number>();
let inactive = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

/**
 * Anota ids como "en pantalla". Cuenta referencias: dos listas con el mismo usuario lo siguen hasta que se
 * desmontan las dos.
 *
 * @returns cómo soltarlos
 */
export function watchPresence(userIds: string[]): () => void {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return () => {};

  let added = false;
  for (const id of ids) {
    const count = watched.get(id) ?? 0;
    if (count === 0) added = true;
    watched.set(id, count + 1);
  }
  if (added) notify();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    let removed = false;
    for (const id of ids) {
      const count = watched.get(id) ?? 0;
      if (count <= 1) {
        watched.delete(id);
        removed = true;
      } else {
        watched.set(id, count - 1);
      }
    }
    if (removed) notify();
  };
}

/** Ids que se están mostrando, ordenados (para comparar con lo último que se mandó). */
export function getWatchedIds(): string[] {
  return Array.from(watched.keys()).sort().slice(0, MAX_WATCHED_USERS);
}

/** La app avisa si el usuario dejó de usarla (o volvió). */
export function setPresenceInactive(value: boolean): void {
  if (inactive === value) return;
  inactive = value;
  notify();
}

export function isPresenceInactive(): boolean {
  return inactive;
}

/** @returns cómo desuscribirse */
export function subscribePresenceSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Para tests. */
export function resetPresenceSync(): void {
  watched.clear();
  inactive = false;
  listeners.clear();
}

/** Sin actividad durante esto, quien eligió "Conectado" se ve "Ausente". */
export const INACTIVE_AFTER_MS = 5 * 60_000;

/**
 * Temporizador de inactividad: la app llama `activity()` con cada interacción y, si pasa `afterMs` sin
 * ninguna, el usuario queda inactivo (setPresenceInactive) hasta la próxima. `stop()` lo apaga y lo deja
 * activo.
 */
export function startInactivityTimer(afterMs = INACTIVE_AFTER_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => setPresenceInactive(true), afterMs);
  };
  arm();

  return {
    activity() {
      setPresenceInactive(false);
      arm();
    },
    stop() {
      clearTimeout(timer);
      setPresenceInactive(false);
    },
  };
}
