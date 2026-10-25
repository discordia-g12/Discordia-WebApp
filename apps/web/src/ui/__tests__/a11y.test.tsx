import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { a11yViolations } from '../../testing/axe';
import { Catalog } from '../Catalog';
import { ServerStrip } from '..';

afterEach(cleanup);

describe('accesibilidad de los componentes base', () => {
  it('el catálogo completo no tiene violaciones de axe', async () => {
    const { container } = render(<Catalog />);
    expect(await a11yViolations(container)).toEqual([]);
  });
});

describe('ServerStrip', () => {
  it('es un botón con el nombre del servidor que marca el activo', () => {
    render(<ServerStrip server={{ name: 'Torton' }} active />);

    const strip = screen.getByRole('button', { name: 'Servidor Torton' });
    expect(strip.getAttribute('aria-current')).toBe('true');
  });

  it('con foco despliega la etiqueta con el nombre y la actividad, y la saca al perderlo', async () => {
    render(<ServerStrip server={{ name: 'Torton' }} unread="Actividad en general" />);

    fireEvent.focus(screen.getByRole('button', { name: 'Servidor Torton' }));
    const label = screen.getByRole('tooltip');
    expect(label.textContent).toContain('Torton');
    expect(label.textContent).toContain('Actividad en general');

    fireEvent.blur(screen.getByRole('button', { name: 'Servidor Torton' }));
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('horizontal (mobile) no despliega la etiqueta flotante', () => {
    render(<ServerStrip server={{ name: 'Torton' }} orientation="horizontal" />);

    fireEvent.focus(screen.getByRole('button', { name: 'Servidor Torton' }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
