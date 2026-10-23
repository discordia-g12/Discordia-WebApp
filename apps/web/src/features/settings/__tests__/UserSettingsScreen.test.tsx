import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { UserSettingsScreen } from '../user/UserSettingsScreen';
import type { User } from '../../../types';

const user = { id: 'me', username: 'mar', displayName: 'Mar', status: 'online', bio: '' } as unknown as User;

const renderSettings = (props: Partial<Parameters<typeof UserSettingsScreen>[0]> = {}) => {
  const handlers = { onClose: vi.fn(), onUpdateUser: vi.fn(), onLogout: vi.fn() };
  render(<UserSettingsScreen currentUser={user} {...handlers} {...props} />);
  return handlers;
};

describe('UserSettingsScreen (rediseño)', () => {
  afterEach(() => {
    localStorage.removeItem('discordia_theme');
    delete document.documentElement.dataset.theme;
    vi.restoreAllMocks();
  });

  it('abre en CUENTA con su índice y cambia de sección con el menú gigante', () => {
    renderSettings();

    expect(screen.getByRole('button', { name: 'Cuenta' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('•Contraseña y seguridad')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Voz' }));
    expect(screen.getByRole('main', { name: 'Voz' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Prueba de micrófono' })).toBeTruthy();
  });

  it('guarda el perfil con el nombre y el estado elegidos', () => {
    const { onUpdateUser } = renderSettings();

    fireEvent.change(screen.getByLabelText('nombre visible'), { target: { value: 'Mar M.' } });
    fireEvent.click(screen.getByRole('radio', { name: 'No molestar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar /' }));

    expect(onUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Mar M.', status: 'dnd' }));
    // Sin "guardado/" inmediato: lo confirma el aviso de la app cuando responde el backend
    expect(screen.queryByText('guardado/')).toBeNull();
  });

  it('lo que no se guarda en el servidor queda deshabilitado con "próximamente"', () => {
    renderSettings();

    const password = screen.getByRole('region', { name: 'Contraseña y seguridad' });
    expect(within(password).getByText('próximamente')).toBeTruthy();
    // Deshabilitados por el fieldset (la propiedad .disabled de cada control no lo refleja; :disabled sí)
    expect(within(password).getByRole('button', { name: 'Actualizar contraseña /' }).matches(':disabled')).toBe(true);
    expect(within(password).getByLabelText('contraseña actual').matches(':disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Factura' }));
    const points = screen.getByRole('region', { name: 'Puntos' });
    expect(within(points).getAllByRole('button', { name: '_comprar' }).every((b) => b.matches(':disabled'))).toBe(true);
  });

  it('EXPERIENCIA cambia el tema de la app y lo recuerda', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Experiencia' }));

    fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('discordia_theme')).toBe('dark');

    fireEvent.click(screen.getByRole('radio', { name: 'Claro' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('NOTIFICACIÓN: interruptores accesibles, deshabilitados hasta que se guarden', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Notificación' }));

    const sounds = screen.getByRole('switch', { name: 'Sonidos' });
    expect(sounds.getAttribute('aria-checked')).toBe('true');
    expect(sounds.matches(':disabled')).toBe(true);
  });

  it('el buscador filtra el menú por lo que hay adentro de cada sección', () => {
    renderSettings();

    fireEvent.change(screen.getByLabelText('Buscar en ajustes'), { target: { value: 'puntos' } });
    const menu = screen.getByRole('navigation', { name: 'Ajustes de usuario' });
    expect(within(menu).getByRole('button', { name: 'Factura' })).toBeTruthy();
    expect(within(menu).queryByRole('button', { name: 'Voz' })).toBeNull();
  });

  it('se cierra con la × y con Escape; cerrar sesión pide confirmación', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onClose, onLogout } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ajustes de usuario' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
