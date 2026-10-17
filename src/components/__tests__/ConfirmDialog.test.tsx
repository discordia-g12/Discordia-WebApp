import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ConfirmDialog } from '../modals/ConfirmDialog';

afterEach(() => cleanup());

describe('ConfirmDialog - cambiar de canal de voz', () => {
  it('muestra el canal actual y el nuevo, y confirma el cambio', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        action="switch-voice-channel"
        targetName="Juegos"
        targetDetail="General"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('¿Cambiar de canal de voz?')).toBeTruthy();
    expect(screen.getByText(/Estás conectado a General\. Si entrás a Juegos/)).toBeTruthy();
    // El canal actual va en el texto, no como "Detalle"
    expect(screen.queryByText(/Detalle:/)).toBeNull();

    fireEvent.click(screen.getByText('Cambiar'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('cancelar no cambia de canal', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        action="switch-voice-channel"
        targetName="Juegos"
        targetDetail="General"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
