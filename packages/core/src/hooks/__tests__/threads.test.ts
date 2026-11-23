import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Message, ThreadSummary } from '../../types';
import type { ThreadPage } from '../../api/threads';
import { configureClient } from '../../api/client';
import {
  applyThreadReply,
  markCachedMessageDeleted,
  mergeCachedMessage,
  messagesQueryKey,
  threadQueryKey,
  type MessagePages,
  type ThreadPages,
} from '../messageCache';
import { isThreadMuted } from '../useNotifications';
import { isInboxEvent } from '../../realtime/inboxSocket';
import { openChatSocket } from '../../realtime/chatSocket';
import type { NotificationPreference } from '../../api/notifications';

const msg = (id: string, extra: Partial<Message> = {}) =>
  ({ id, content: id, authorId: 'u1', channelId: 'c1', timestamp: '', ...extra }) as Message;
const summary = (replyCount: number): ThreadSummary => ({
  replyCount,
  lastReplyAt: '2026-11-23T10:00:00Z',
  lastReplyId: 'r1',
  participantIds: ['u1', 'u2'],
});
const threadPage = (parent: Message, replies: Message[], hasMore = false): ThreadPage => ({
  parent,
  replies,
  hasMore,
  nextCursor: hasMore ? replies[replies.length - 1].id : null,
});

function setup(threadPages: ThreadPage[]) {
  const qc = new QueryClient();
  qc.setQueryData<MessagePages>(messagesQueryKey('c1'), { pages: [[msg('p'), msg('x')]], pageParams: [undefined] });
  qc.setQueryData<ThreadPages>(threadQueryKey('c1', 'p'), {
    pages: threadPages,
    pageParams: threadPages.map((_, i) => (i ? `c${i}` : undefined)),
  });
  const thread = () => qc.getQueryData<ThreadPages>(threadQueryKey('c1', 'p'))!;
  const channel = () => qc.getQueryData<MessagePages>(messagesQueryKey('c1'))!.pages[0];
  return { qc, thread, channel };
}

describe('caché de hilos', () => {
  it('applyThreadReply: suma la respuesta al final del hilo y el resumen al original, en el canal y en el hilo', () => {
    const { qc, thread, channel } = setup([threadPage(msg('p'), [msg('r1')])]);

    applyThreadReply(qc, 'c1', 'p', msg('r2', { threadParentId: 'p' }), summary(2));

    expect(thread().pages[0].replies.map((m) => m.id)).toEqual(['r1', 'r2']);
    expect(thread().pages[0].parent.thread?.replyCount).toBe(2);
    expect(channel().find((m) => m.id === 'p')?.thread?.replyCount).toBe(2);
    // La respuesta no entra al canal
    expect(channel().map((m) => m.id)).toEqual(['p', 'x']);
  });

  it('applyThreadReply es idempotente (llega por el POST, el socket y el inbox)', () => {
    const { qc, thread } = setup([threadPage(msg('p'), [msg('r1')])]);
    applyThreadReply(qc, 'c1', 'p', msg('r2'));
    const once = thread();
    applyThreadReply(qc, 'c1', 'p', msg('r2'));
    expect(thread()).toBe(once);
  });

  it('si faltan páginas por cargar no agrega la respuesta (quedaría un hueco)', () => {
    const { qc, thread } = setup([threadPage(msg('p'), [msg('r1')], true)]);
    applyThreadReply(qc, 'c1', 'p', msg('r9'), summary(9));
    expect(thread().pages[0].replies.map((m) => m.id)).toEqual(['r1']);
    expect(thread().pages[0].parent.thread?.replyCount).toBe(9);
  });

  it('sin el hilo cargado no lo crea, pero el canal igual recibe el resumen', () => {
    const qc = new QueryClient();
    qc.setQueryData<MessagePages>(messagesQueryKey('c1'), { pages: [[msg('p')]], pageParams: [undefined] });
    applyThreadReply(qc, 'c1', 'p', msg('r1'), summary(1));
    expect(qc.getQueryData(threadQueryKey('c1', 'p'))).toBeUndefined();
    expect(qc.getQueryData<MessagePages>(messagesQueryKey('c1'))!.pages[0][0].thread?.replyCount).toBe(1);
  });

  it('editar o borrar una respuesta (MESSAGE_UPDATED / DELETED) la actualiza dentro del hilo', () => {
    const { qc, thread } = setup([threadPage(msg('p'), [msg('r1'), msg('r2')])]);

    mergeCachedMessage(qc, 'c1', msg('r1', { content: 'editado', threadParentId: 'p' }));
    markCachedMessageDeleted(qc, 'c1', msg('r2', { threadParentId: 'p' }));

    const [r1, r2] = thread().pages[0].replies;
    expect(r1.content).toBe('editado');
    expect(r2.type).toBe('deleted');
  });

  it('un cambio en el original (reacción, edición) también se ve en el hilo', () => {
    const { qc, thread } = setup([threadPage(msg('p'), [])]);
    mergeCachedMessage(qc, 'c1', msg('p', { content: 'original editado' }));
    expect(thread().pages[0].parent.content).toBe('original editado');
  });
});

describe('isThreadMuted', () => {
  const pref = (change: Partial<NotificationPreference>): NotificationPreference => ({
    scopeType: 'thread',
    scopeId: 't1',
    serverId: null,
    level: null,
    muted: true,
    mutedUntil: null,
    updatedAt: '',
    ...change,
  });
  const now = new Date('2026-11-23T12:00:00Z');

  it('silenciado sin vencimiento, o con vencimiento futuro', () => {
    expect(isThreadMuted([pref({})], 't1', now)).toBe(true);
    expect(isThreadMuted([pref({ mutedUntil: '2026-11-24T00:00:00Z' })], 't1', now)).toBe(true);
  });

  it('no silenciado: vencido, muted false, otro hilo o sin preferencias', () => {
    expect(isThreadMuted([pref({ mutedUntil: '2026-11-23T11:00:00Z' })], 't1', now)).toBe(false);
    expect(isThreadMuted([pref({ muted: false })], 't1', now)).toBe(false);
    expect(isThreadMuted([pref({ scopeId: 'otro' })], 't1', now)).toBe(false);
    expect(isThreadMuted([pref({ scopeType: 'channel' })], 't1', now)).toBe(false);
    expect(isThreadMuted(undefined, 't1', now)).toBe(false);
  });
});

describe('isInboxEvent: hilos y avisos', () => {
  const reply = { id: 'r1', content: 'hola', authorId: 'u2', channelId: 'dm-1', createdAt: '' };

  it('DM_THREAD_REPLY_CREATED necesita conversación, original, respuesta y resumen', () => {
    const event = { type: 'DM_THREAD_REPLY_CREATED', conversationId: 'dm-1', parentId: 'p', reply, thread: summary(1) };
    expect(isInboxEvent(event)).toBe(true);
    expect(isInboxEvent({ ...event, conversationId: undefined })).toBe(false);
    expect(isInboxEvent({ ...event, reply: {} })).toBe(false);
    expect(isInboxEvent({ ...event, thread: undefined })).toBe(false);
  });

  it('NOTIFICATION_CREATED necesita canal y motivo', () => {
    const notification = { reason: 'thread_reply', channelId: 'c1', threadId: 'p' };
    expect(isInboxEvent({ type: 'NOTIFICATION_CREATED', notification })).toBe(true);
    expect(isInboxEvent({ type: 'NOTIFICATION_CREATED', notification: null })).toBe(false);
    expect(isInboxEvent({ type: 'NOTIFICATION_CREATED', notification: { reason: 'x' } })).toBe(false);
  });
});

describe('openChatSocket: THREAD_REPLY_CREATED', () => {
  class FakeWebSocket {
    static OPEN = 1;
    static instance: FakeWebSocket;
    readyState = 0;
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    close = vi.fn();
    constructor() {
      FakeWebSocket.instance = this;
    }
  }
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    configureClient({ baseUrl: 'https://api.discordia.lol', getToken: async () => 'tok' });
  });
  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
  });

  it('va a onThreadReply y nunca a onMessage (no es un mensaje del canal)', async () => {
    const onMessage = vi.fn();
    const onThreadReply = vi.fn();
    const connection = openChatSocket('c1', { onMessage, onThreadReply });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const reply = { id: 'r1', content: 'hola', authorId: 'u2', channelId: 'c1', createdAt: '', threadParentId: 'p' };

    FakeWebSocket.instance.onmessage?.({
      data: JSON.stringify({ type: 'THREAD_REPLY_CREATED', channelId: 'c1', parentId: 'p', reply, thread: summary(1) }),
    });
    FakeWebSocket.instance.onmessage?.({ data: JSON.stringify({ type: 'THREAD_REPLY_CREATED', parentId: 'p' }) });

    expect(onThreadReply).toHaveBeenCalledTimes(1);
    expect(onThreadReply.mock.calls[0][0].reply.id).toBe('r1');
    expect(onMessage).not.toHaveBeenCalled();
    connection.close();
  });
});

describe('textos del hilo', async () => {
  const { canStartThread, hasThreadReplies, replyCountLabel, threadSummaryLabel } = await import('../../chat/threads');
  const now = Date.parse('2026-11-23T10:05:00Z');

  it('cuenta en singular y plural, con la última respuesta', () => {
    expect(replyCountLabel(1)).toBe('1 respuesta');
    expect(replyCountLabel(3)).toBe('3 respuestas');
    expect(threadSummaryLabel(summary(3), now)).toBe('3 respuestas · última hace 5 min');
  });

  it('el resumen solo va en un original con respuestas; el hilo no se abre desde respuestas, avisos ni borrados', () => {
    expect(hasThreadReplies(msg('p', { thread: summary(1) }))).toBe(true);
    expect(hasThreadReplies(msg('p', { thread: summary(0) }))).toBe(false);
    expect(hasThreadReplies(msg('p'))).toBe(false);
    expect(canStartThread(msg('p'))).toBe(true);
    expect(canStartThread(msg('r', { threadParentId: 'p' }))).toBe(false);
    expect(canStartThread(msg('s', { type: 'system' }))).toBe(false);
    expect(canStartThread(msg('d', { type: 'deleted' }))).toBe(false);
  });
});

describe('textos de los avisos', async () => {
  const { notificationBadge, notificationTitle } = await import('../../api/notifications');

  it('título por motivo y contador con tope', () => {
    expect(notificationTitle('thread_reply', 'Ana')).toBe('Ana respondió en un hilo');
    expect(notificationTitle('mention', 'Ana')).toBe('Ana te mencionó');
    expect(notificationTitle('dm', 'Ana')).toBe('Ana te escribió');
    expect(notificationBadge(0)).toBeNull();
    expect(notificationBadge(7)).toBe('7');
    expect(notificationBadge(100)).toBe('99+');
  });
});
