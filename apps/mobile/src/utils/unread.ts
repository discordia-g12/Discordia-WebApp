import type { Server } from '../types'

/** Contador como se muestra: a partir de 100 (el tope de Chat-Engine), "99+". Igual que en la web. */
export function formatUnreadCount(count: number): string {
  return count > 99 ? '99+' : String(count)
}

/** Actividad de un servidor para su franja ("3 mensajes nuevos", "2 menciones"), o false si no hay nada. */
export function serverUnreadLabel(server: Server): string | false {
  const count = server.unreadCount ?? 0
  if (count <= 0) return false
  if (server.mentions) return server.mentions === 1 ? '1 mención' : `${formatUnreadCount(server.mentions)} menciones`
  return count === 1 ? '1 mensaje nuevo' : `${formatUnreadCount(count)} mensajes nuevos`
}
