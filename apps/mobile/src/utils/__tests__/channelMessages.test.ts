import { describe, it, expect } from 'vitest'
import type { Message } from '../../types'
import { markDeletedInList, setThreadSummaryInList } from '../channelMessages'

const msg = (id: string, extra: Partial<Message> = {}) =>
  ({ id, content: id, authorId: 'u1', channelId: 'c1', timestamp: '', ...extra }) as Message
const thread = { replyCount: 2, lastReplyAt: '2026-11-23T10:00:00Z', lastReplyId: 'r2', participantIds: ['u1'] }

describe('lista local de un canal (mobile)', () => {
  it('MESSAGE_DELETED de otro: queda eliminado, sin adjuntos ni fijado (C6)', () => {
    const list = [msg('a'), msg('b', { isPinned: true, attachments: [{ id: 'f', name: 'f', url: 'u', size: 1 }] as Message['attachments'] })]
    const [a, b] = markDeletedInList(list, msg('b'))
    expect(a).toBe(list[0])
    expect(b).toMatchObject({ type: 'deleted', content: '', attachments: [], isPinned: false })
  })

  it('un original borrado conserva el resumen del hilo', () => {
    const [p] = markDeletedInList([msg('p', { thread })], msg('p'))
    expect(p.thread?.replyCount).toBe(2)
  })

  it('THREAD_REPLY_CREATED solo cambia el resumen del original', () => {
    const list = [msg('p'), msg('x')]
    const next = setThreadSummaryInList(list, 'p', thread)
    expect(next[0].thread).toEqual(thread)
    expect(next[1]).toBe(list[1])
    expect(next).toHaveLength(2)
  })
})
