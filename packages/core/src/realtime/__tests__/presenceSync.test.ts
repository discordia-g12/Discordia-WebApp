import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getWatchedIds,
  INACTIVE_AFTER_MS,
  isPresenceInactive,
  MAX_WATCHED_USERS,
  resetPresenceSync,
  setPresenceInactive,
  startInactivityTimer,
  subscribePresenceSync,
  watchPresence,
} from '../presenceSync';

describe('presenceSync', () => {
  beforeEach(() => resetPresenceSync());

  it('sigue a un usuario mientras alguna lista lo muestre', () => {
    const listener = vi.fn();
    subscribePresenceSync(listener);

    const friends = watchPresence(['u2', 'u1', 'u1', '']);
    const members = watchPresence(['u2', 'u3']);
    expect(getWatchedIds()).toEqual(['u1', 'u2', 'u3']);
    expect(listener).toHaveBeenCalledTimes(2);

    friends();
    friends(); // soltar dos veces no descuenta de más
    expect(getWatchedIds()).toEqual(['u2', 'u3']);

    members();
    expect(getWatchedIds()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('sin ids nuevos ni soltados no avisa', () => {
    const listener = vi.fn();
    const release = watchPresence(['u1']);
    subscribePresenceSync(listener);

    const again = watchPresence(['u1']);
    again();
    watchPresence([])();

    expect(listener).not.toHaveBeenCalled();
    release();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it(`manda como mucho ${MAX_WATCHED_USERS} ids`, () => {
    watchPresence(Array.from({ length: MAX_WATCHED_USERS + 20 }, (_, i) => `u${String(i).padStart(4, '0')}`));

    expect(getWatchedIds()).toHaveLength(MAX_WATCHED_USERS);
  });

  it('avisa la inactividad solo cuando cambia', () => {
    const listener = vi.fn();
    const unsubscribe = subscribePresenceSync(listener);

    setPresenceInactive(true);
    setPresenceInactive(true);
    expect(isPresenceInactive()).toBe(true);
    setPresenceInactive(false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setPresenceInactive(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  describe('startInactivityTimer', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('sin actividad durante el plazo queda inactivo, y vuelve con la próxima', () => {
      const timer = startInactivityTimer();

      vi.advanceTimersByTime(INACTIVE_AFTER_MS - 1);
      expect(isPresenceInactive()).toBe(false);
      vi.advanceTimersByTime(1);
      expect(isPresenceInactive()).toBe(true);

      timer.activity();
      expect(isPresenceInactive()).toBe(false);
      timer.stop();
    });

    it('la actividad reinicia el plazo', () => {
      const timer = startInactivityTimer(1000);

      vi.advanceTimersByTime(900);
      timer.activity();
      vi.advanceTimersByTime(900);
      expect(isPresenceInactive()).toBe(false);
      vi.advanceTimersByTime(100);
      expect(isPresenceInactive()).toBe(true);
      timer.stop();
    });

    it('al apagarlo queda activo y no vuelve a marcar', () => {
      const timer = startInactivityTimer(1000);
      vi.advanceTimersByTime(1000);

      timer.stop();
      expect(isPresenceInactive()).toBe(false);
      vi.advanceTimersByTime(5000);
      expect(isPresenceInactive()).toBe(false);
    });
  });
});
