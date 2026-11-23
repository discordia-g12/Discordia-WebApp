import type { ThreadSummary } from '@discordia/core'
import type { Message, MessageBackendPayload } from '../types'

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

/**
 * Lo nuevo de un mensaje que ya está en la lista (edición, reacción, fijado, resumen del hilo, o el eco de uno
 * propio). null si no está: quien llama decide si agregarlo (solo un mensaje nuevo, nunca un MESSAGE_UPDATED).
 */
export function mergeIntoList(list: Message[], payload: MessageBackendPayload, normalized: Message): Message[] | null {
  const index = list.findIndex(m => m.id === payload.id)
  if (index === -1) return null
  const current = list[index]
  const updated = [...list]
  updated[index] = {
    ...current,
    status: 'sent',
    content: payload.content,
    edited: payload.edited ?? (payload.editedTimestamp ? true : current.edited),
    editedTimestamp: payload.editedTimestamp ?? current.editedTimestamp,
    reactions: payload.reactions !== undefined ? payload.reactions : current.reactions,
    isPinned: normalized.isPinned,
    pinnedAt: normalized.pinnedAt,
    pinnedBy: normalized.pinnedBy,
    // Borrar una respuesta publica el original con el contador nuevo
    thread: normalized.thread ?? current.thread,
    // Editar o borrar el citado actualiza la copia en las respuestas
    replyTo: normalized.replyTo ?? current.replyTo,
  }
  return updated
}
