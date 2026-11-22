import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { INACTIVE_AFTER_MS, isPresenceInactive, resetPresenceSync } from '@discordia/core';
import { useInactivity } from '../useInactivity';

describe('useInactivity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPresenceSync();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetPresenceSync();
  });

  it('sin interacción durante el plazo queda inactivo; una tecla lo devuelve', () => {
    renderHook(() => useInactivity(true));

    vi.advanceTimersByTime(INACTIVE_AFTER_MS);
    expect(isPresenceInactive()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown'));
    expect(isPresenceInactive()).toBe(false);
  });

  it('mover el mouse reinicia el plazo', () => {
    renderHook(() => useInactivity(true));

    vi.advanceTimersByTime(INACTIVE_AFTER_MS - 1000);
    window.dispatchEvent(new Event('pointermove'));
    vi.advanceTimersByTime(INACTIVE_AFTER_MS - 1000);

    expect(isPresenceInactive()).toBe(false);
  });

  it('sin sesión no hace nada, y al desmontarse queda activo', () => {
    const { rerender, unmount } = renderHook(({ enabled }) => useInactivity(enabled), { initialProps: { enabled: false } });
    vi.advanceTimersByTime(INACTIVE_AFTER_MS);
    expect(isPresenceInactive()).toBe(false);

    rerender({ enabled: true });
    vi.advanceTimersByTime(INACTIVE_AFTER_MS);
    expect(isPresenceInactive()).toBe(true);

    unmount();
    expect(isPresenceInactive()).toBe(false);
  });
});
