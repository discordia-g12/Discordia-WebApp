import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// public/sw.js es un script clásico: se evalúa con un `self` de mentira y se disparan sus eventos
const source = readFileSync(resolve(__dirname, '../../../public/sw.js'), 'utf8');

const DATA = { notificationId: 'n1', reason: 'dm', serverId: null, channelId: 'dm-1', threadId: null, messageId: 'm1' };

function loadWorker(windows: { focused: boolean }[]) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const clients = windows.map((w) => ({ ...w, postMessage: vi.fn(), focus: vi.fn(() => Promise.resolve()) }));
  const self = {
    addEventListener: (type: string, fn: (event: unknown) => void) => (listeners[type] = fn),
    clients: { matchAll: vi.fn(() => Promise.resolve(clients)), openWindow: vi.fn(() => Promise.resolve()) },
    registration: { showNotification: vi.fn(() => Promise.resolve()) },
  };
  new Function('self', source)(self);
  const dispatch = async (type: string, event: object) => {
    let pending: Promise<unknown> = Promise.resolve();
    listeners[type]({ ...event, waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending;
  };
  return { self, clients, dispatch };
}

const pushEvent = (payload: unknown) => ({ data: { json: () => payload } });

describe('sw.js: push', () => {
  it('muestra el aviso si ninguna ventana tiene foco', async () => {
    const { self, dispatch } = loadWorker([{ focused: false }]);
    await dispatch('push', pushEvent({ title: 'Ana te escribió', body: 'hola', data: DATA }));
    expect(self.registration.showNotification).toHaveBeenCalledWith('Ana te escribió', expect.objectContaining({ body: 'hola', tag: 'n1', data: DATA }));
  });

  it('no lo muestra con una ventana con foco: avisa la bandeja', async () => {
    const { self, dispatch } = loadWorker([{ focused: false }, { focused: true }]);
    await dispatch('push', pushEvent({ title: 't', body: 'b', data: DATA }));
    expect(self.registration.showNotification).not.toHaveBeenCalled();
  });

  it('un push sin JSON se muestra con el título por defecto', async () => {
    const { self, dispatch } = loadWorker([]);
    await dispatch('push', { data: { json: () => { throw new SyntaxError('x'); } } });
    expect(self.registration.showNotification).toHaveBeenCalledWith('Discordia', expect.objectContaining({ data: null }));
  });
});

describe('sw.js: notificationclick', () => {
  const clickEvent = () => ({ notification: { data: DATA, close: vi.fn() } });

  it('con una ventana abierta la enfoca y le pasa el destino', async () => {
    const { self, clients, dispatch } = loadWorker([{ focused: false }]);
    const event = clickEvent();
    await dispatch('notificationclick', event);
    expect(event.notification.close).toHaveBeenCalled();
    expect(clients[0].postMessage).toHaveBeenCalledWith({ type: 'push-open', data: DATA });
    expect(clients[0].focus).toHaveBeenCalled();
    expect(self.clients.openWindow).not.toHaveBeenCalled();
  });

  it('sin ventanas abre la app con el destino en ?push=', async () => {
    const { self, dispatch } = loadWorker([]);
    await dispatch('notificationclick', clickEvent());
    expect(self.clients.openWindow).toHaveBeenCalledWith('/?push=' + encodeURIComponent(JSON.stringify(DATA)));
  });
});
