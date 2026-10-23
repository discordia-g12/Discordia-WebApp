import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Choice, ConfirmDialog, ConnectionBanner, Modal, ModalActions, ModalForm } from '..';

afterEach(cleanup);

describe('Modal', () => {
  it('el título nombra al diálogo y la bajada lleva barra inicial', () => {
    render(
      <Modal title="Crear servidor" description="donde pasan el rato" onClose={vi.fn()}>
        <p>contenido</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Crear servidor' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('/ donde pasan el rato')).toBeTruthy();
  });

  it('se cierra con la ×, con Escape y tocando afuera', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Invitar" onClose={onClose}>
        <p>contenido</p>
      </Modal>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar: Invitar' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(container.querySelector('[aria-hidden="true"]')!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('lleva el foco adentro al abrirse, lo deja dar la vuelta y lo devuelve al cerrarse', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(
      <Modal title="Crear canal" onClose={vi.fn()}>
        <input aria-label="nombre" />
        <ModalActions>
          <button type="button">crear</button>
        </ModalActions>
      </Modal>
    );

    expect(document.activeElement).toBe(screen.getByLabelText('nombre'));
    // Desde el último control (la ×), Tab vuelve al primero
    const close = screen.getByRole('button', { name: 'Cerrar: Crear canal' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByLabelText('nombre'));

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('ModalForm envía con Enter sin recargar la página', () => {
    const onSubmit = vi.fn();
    render(
      <Modal title="Crear categoría" onClose={vi.fn()}>
        <ModalForm onSubmit={onSubmit}>
          <input aria-label="nombre" />
        </ModalForm>
      </Modal>
    );

    fireEvent.submit(screen.getByLabelText('nombre'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('ConfirmDialog', () => {
  it('cambiar de canal de voz: dice de dónde sale y adónde entra, sin bloque rojo', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog action="switch-voice-channel" targetName="Juegos" targetDetail="General" onConfirm={onConfirm} onCancel={vi.fn()} />
    );

    expect(screen.getByRole('alertdialog', { name: '¿Cambiar de canal?' })).toBeTruthy();
    expect(screen.getByText(/Estás conectado a General\. Si entrás a Juegos/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar /' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('_cancelar no confirma', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog action="delete-channel" targetName="general" onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: '_cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('eliminar un servidor pide escribir su nombre antes de habilitar el botón', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog action="delete-server" targetName="Torton" onConfirm={onConfirm} onCancel={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Eliminar /' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Escribí el nombre del servidor/), { target: { value: 'torton' } });
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('Choice', () => {
  it('es un grupo de radios: marca la opción elegida y avisa el cambio', () => {
    const onChange = vi.fn();
    render(
      <Choice
        label="Tipo de canal"
        options={[
          { value: 'text', label: 'Texto' },
          { value: 'voice', label: 'Voz' },
        ]}
        value="text"
        onChange={onChange}
      />
    );

    expect(screen.getByRole('radiogroup', { name: 'Tipo de canal' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Texto' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Voz' }));
    expect(onChange).toHaveBeenCalledWith('voice');
  });
});

describe('ConnectionBanner', () => {
  it('solo aparece mientras reconecta, y lo anuncia', () => {
    const { rerender } = render(<ConnectionBanner active={false} />);
    expect(screen.queryByRole('status')).toBeNull();

    rerender(<ConnectionBanner active />);
    expect(screen.getByRole('status').textContent).toBe('Reconectando');
  });
});
