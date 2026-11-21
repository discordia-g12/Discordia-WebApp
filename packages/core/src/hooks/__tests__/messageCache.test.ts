import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Message } from '../../types';
import {
  appendMessage,
  flattenMessagePages,
  markCachedMessageDeleted,
  mergeCachedMessage,
  messagesQueryKey,
  olderPageParam,
  pinnedMessagesQueryKey,
  syncPinnedMessage,
  type MessagePages,
} from '../messageCache';

const msg = (id: string) => ({ id, content: id, authorId: 'u1', channelId: 'c1' }) as Message;
const pages = (...list: Message[][]): MessagePages => ({ pages: list, pageParams: list.map((_, i) => (i ? `p${i}` : undefined)) });

describe('messageCache', () => {
  it('pide la página anterior con el mensaje más viejo, salvo que la última haya venido incompleta', () => {
    expect(olderPageParam([msg('a'), msg('b')], 2)).toBe('a');
    expect(olderPageParam([msg('a')], 2)).toBeUndefined();
    expect(olderPageParam([], 2)).toBeUndefined();
  });

  it('junta las páginas de la más vieja a la más nueva', () => {
    const data = pages([msg('c'), msg('d')], [msg('a'), msg('b')]);
    expect(flattenMessagePages(data).map((m) => m.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('agrega lo nuevo al final de la página más nueva, sin duplicar', () => {
    const data = pages([msg('c')], [msg('a')]);
    const next = appendMessage(data, msg('d'))!;
    expect(next.pages[0].map((m) => m.id)).toEqual(['c', 'd']);
    expect(next.pages[1]).toBe(data.pages[1]);
    // Ya está en una página vieja (llegó por la reconexión): no se agrega otra vez
    expect(appendMessage(next, msg('a'))).toBe(next);
  });

  it('sin historial cargado no crea uno', () => {
    expect(appendMessage(undefined, msg('a'))).toBeUndefined();
  });
});

describe('fijados en el caché', () => {
  const pinned = (id: string, pinnedAt: string) => ({ ...msg(id), isPinned: true, pinnedAt }) as Message;
  const pinsOf = (qc: QueryClient) => qc.getQueryData<Message[]>(pinnedMessagesQueryKey('c1'))?.map((m) => m.id);

  it('syncPinnedMessage agrega lo fijado ordenado, actualiza lo que ya estaba y saca lo desfijado', () => {
    const qc = new QueryClient();
    qc.setQueryData(pinnedMessagesQueryKey('c1'), [pinned('a', '2026-01-01')]);

    syncPinnedMessage(qc, 'c1', pinned('b', '2026-02-01'));
    expect(pinsOf(qc)).toEqual(['b', 'a']);

    syncPinnedMessage(qc, 'c1', { ...pinned('a', '2026-01-01'), content: 'editado' });
    expect(qc.getQueryData<Message[]>(pinnedMessagesQueryKey('c1'))?.[1].content).toBe('editado');

    syncPinnedMessage(qc, 'c1', { ...msg('b'), isPinned: false });
    expect(pinsOf(qc)).toEqual(['a']);
  });

  it('syncPinnedMessage no crea la lista si todavía no se pidió', () => {
    const qc = new QueryClient();
    syncPinnedMessage(qc, 'c1', pinned('a', '2026-01-01'));
    expect(qc.getQueryData(pinnedMessagesQueryKey('c1'))).toBeUndefined();
  });

  it('mergeCachedMessage actualiza el historial y los fijados', () => {
    const qc = new QueryClient();
    qc.setQueryData<MessagePages>(messagesQueryKey('c1'), pages([msg('a'), msg('b')]));
    qc.setQueryData(pinnedMessagesQueryKey('c1'), []);

    mergeCachedMessage(qc, 'c1', pinned('b', '2026-01-01'));

    const history = flattenMessagePages(qc.getQueryData<MessagePages>(messagesQueryKey('c1'))!);
    expect(history.map((m) => m.isPinned)).toEqual([undefined, true]);
    expect(pinsOf(qc)).toEqual(['b']);
  });

  it('markCachedMessageDeleted lo deja eliminado y lo saca de los fijados', () => {
    const qc = new QueryClient();
    qc.setQueryData<MessagePages>(messagesQueryKey('c1'), pages([pinned('a', '2026-01-01')]));
    qc.setQueryData(pinnedMessagesQueryKey('c1'), [pinned('a', '2026-01-01')]);

    markCachedMessageDeleted(qc, 'c1', msg('a'));

    const [deleted] = flattenMessagePages(qc.getQueryData<MessagePages>(messagesQueryKey('c1'))!);
    expect(deleted.type).toBe('deleted');
    expect(deleted.isPinned).toBe(false);
    expect(pinsOf(qc)).toEqual([]);
  });
});
