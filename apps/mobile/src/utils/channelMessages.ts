import type { ThreadSummary } from '@discordia/core'
import type { Message } from '../types'

/**
 * Un mensaje que otro borró (MESSAGE_DELETED por el socket, deuda C6): queda como "eliminado", deja de estar
 * fijado y conserva el resumen de su hilo (un original borrado sigue mostrando sus respuestas).
 */
export function markDeletedInList(list: Message[], deleted: Message): Message[] {
  return list.map(m =>
    m.id === deleted.id
      ? { ...m, type: 'deleted' as const, content: '', attachments: [], isPinned: false, thread: deleted.thread ?? m.thread }
      : m,
  )
}

/** El resumen nuevo del original de un hilo (THREAD_REPLY_CREATED). Las respuestas no entran a la lista del canal. */
export function setThreadSummaryInList(list: Message[], parentId: string, thread: ThreadSummary): Message[] {
  return list.map(m => (m.id === parentId ? { ...m, thread } : m))
}
