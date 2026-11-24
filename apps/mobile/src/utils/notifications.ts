import type { NotificationLevel, Server } from '@discordia/core'

/** Nombre del canal de un aviso, si el servidor está cargado (un DM no tiene). */
export function notificationChannelName(servers: Server[], serverId: string | null, channelId: string): string | null {
  if (!serverId) return null
  const server = servers.find(s => s.id === serverId)
  return server?.categories.flatMap(c => c.channels).find(c => c.id === channelId)?.name ?? null
}

/** Las opciones del selector de nivel: los tres niveles y "Heredar" (nivel propio null). */
export type NotificationLevelChoice = NotificationLevel | 'inherit'

export const toLevelChoice = (level: NotificationLevel | null): NotificationLevelChoice => level ?? 'inherit'
export const fromLevelChoice = (choice: NotificationLevelChoice): NotificationLevel | null =>
  choice === 'inherit' ? null : choice
