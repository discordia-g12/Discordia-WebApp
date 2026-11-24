import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerPushDevice, unregisterPushDevice } from '@discordia/core';
import { subscribeToPush, unregisterFromPush, vapidKeyToBytes, UNREGISTER_TIMEOUT_MS } from '../push';

vi.mock('@discordia/core', () => ({
  registerPushDevice: vi.fn(() => Promise.resolve()),
  unregisterPushDevice: vi.fn(() => Promise.resolve()),
}));

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

function fakeSubscription() {
  return {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'p256', auth: 'auth' } }),
    unsubscribe: vi.fn(() => Promise.resolve(true)),
  };
}

/** navigator.serviceWorker, PushManager y Notification de mentira: jsdom no los tiene. */
function installPush({ permission = 'granted', existing = null }: { permission?: NotificationPermission; existing?: ReturnType<typeof fakeSubscription> | null } = {}) {
  const created = fakeSubscription();
  const pushManager = {
    getSubscription: vi.fn(() => Promise.resolve(existing)),
    subscribe: vi.fn(() => Promise.resolve(created)),
  };
  const registration = { pushManager };
  vi.stubGlobal('PushManager', class {});
  vi.stubGlobal('Notification', { permission, requestPermission: vi.fn(() => Promise.resolve(permission)) });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve(registration), getRegistration: vi.fn(() => Promise.resolve(registration)) },
  });
  return { pushManager, created };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  vi.unstubAllGlobals();
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe('vapidKeyToBytes', () => {
  it('decodifica base64url sin relleno', () => {
    // "AQID_w" = bytes 1, 2, 3, 255 ("/" y "+" van como "_" y "-")
    expect([...vapidKeyToBytes('AQID_w')]).toEqual([1, 2, 3, 255]);
  });
});

describe('subscribeToPush', () => {
  it('pide permiso, se suscribe con la clave y registra la suscripción', async () => {
    const { pushManager } = installPush();
    await expect(subscribeToPush('AQID_w')).resolves.toBe('subscribed');
    expect(pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) });
    expect(registerPushDevice).toHaveBeenCalledWith({
      platform: 'web',
      subscription: { endpoint: ENDPOINT, keys: { p256dh: 'p256', auth: 'auth' } },
    });
  });

  it('reusa la suscripción que ya tiene el navegador', async () => {
    const { pushManager } = installPush({ existing: fakeSubscription() });
    await subscribeToPush('AQID_w');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(registerPushDevice).toHaveBeenCalled();
  });

  it('sin permiso no se suscribe ni registra', async () => {
    const { pushManager } = installPush({ permission: 'denied' });
    await expect(subscribeToPush('AQID_w')).resolves.toBe('denied');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(registerPushDevice).not.toHaveBeenCalled();
  });
});

describe('unregisterFromPush', () => {
  it('borra el endpoint del backend y desuscribe el navegador', async () => {
    const existing = fakeSubscription();
    installPush({ existing });
    await unregisterFromPush();
    expect(unregisterPushDevice).toHaveBeenCalledWith(ENDPOINT, { timeoutMs: UNREGISTER_TIMEOUT_MS });
    expect(existing.unsubscribe).toHaveBeenCalled();
  });

  it('no lanza si el backend falla: el cierre de sesión sigue', async () => {
    const existing = fakeSubscription();
    installPush({ existing });
    vi.mocked(unregisterPushDevice).mockRejectedValueOnce(new Error('timeout'));
    await expect(unregisterFromPush()).resolves.toBeUndefined();
    expect(existing.unsubscribe).toHaveBeenCalled();
  });

  it('sin suscripción ni soporte no hace nada', async () => {
    installPush();
    await unregisterFromPush();
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    await unregisterFromPush();
    expect(unregisterPushDevice).not.toHaveBeenCalled();
  });
});
