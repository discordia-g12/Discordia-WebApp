import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { durations } from '@discordia/tokens';
import { showToast, useUIStore } from '../uiStore';

describe('avisos (uiStore)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUIStore.setState({ toast: null });
  });
  afterEach(() => vi.useRealTimers());

  it('se van solos al tiempo del token', () => {
    showToast('Mensaje enviado');
    vi.advanceTimersByTime(durations.toast - 1);
    expect(useUIStore.getState().toast?.message).toBe('Mensaje enviado');
    vi.advanceTimersByTime(1);
    expect(useUIStore.getState().toast).toBeNull();
  });

  it('el timer de un aviso anterior no cierra al que lo reemplazó', () => {
    showToast('primero');
    vi.advanceTimersByTime(durations.toast - 100);
    showToast('segundo');
    vi.advanceTimersByTime(100);
    expect(useUIStore.getState().toast?.message).toBe('segundo');
    vi.advanceTimersByTime(durations.toast);
    expect(useUIStore.getState().toast).toBeNull();
  });

  it('con una acción dura el doble, para que dé tiempo a usarla', () => {
    const retry = vi.fn();
    showToast('No se pudo enviar el mensaje', 'danger', { label: 'reintentar', onPress: retry });
    vi.advanceTimersByTime(durations.toast);
    expect(useUIStore.getState().toast?.action?.label).toBe('reintentar');
    vi.advanceTimersByTime(durations.toast);
    expect(useUIStore.getState().toast).toBeNull();
  });
});
