import { describe, it, expect } from 'vitest';
import type { Message } from '../../types';
import { appendMessage, flattenMessagePages, olderPageParam, type MessagePages } from '../messageCache';

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
