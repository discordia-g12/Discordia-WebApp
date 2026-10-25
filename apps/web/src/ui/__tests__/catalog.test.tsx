import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import {
  ActionLink,
  BlockButton,
  DisplayText,
  EmptyState,
  SectionLabel,
  Skeleton,
  SquareAvatar,
  Tabs,
  Toast,
  UnderlineInput,
} from '..';

afterEach(cleanup);

describe('UnderlineInput', () => {
  it('asocia la etiqueta al campo y marca el obligatorio', () => {
    render(<UnderlineInput label="correo electrónico" required placeholder="ejemplo@discordia.lol" />);

    const input = screen.getByLabelText(/correo electrónico/);
    expect(input).toBe(screen.getByPlaceholderText('ejemplo@discordia.lol'));
    expect((input as HTMLInputElement).required).toBe(true);
  });

  it('muestra el error con barra inicial, lo describe y marca el campo inválido', () => {
    render(<UnderlineInput label="usuario" hint="mínimo 3 caracteres" error="ya está en uso" />);

    const input = screen.getByLabelText('usuario');
    expect(screen.getByText('/ ya está en uso')).toBeTruthy();
    expect(screen.queryByText(/mínimo 3 caracteres/)).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('/ ya está en uso');
  });

  it('secret oculta el texto y lo alterna con el ojo', () => {
    render(<UnderlineInput label="contraseña" secret />);

    const input = screen.getByLabelText('contraseña') as HTMLInputElement;
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(input.type).toBe('text');
    const hide = screen.getByRole('button', { name: 'Ocultar contraseña' });
    expect(hide.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(hide);
    expect(input.type).toBe('password');
  });
});

describe('ActionLink y BlockButton', () => {
  it('ActionLink se muestra con guion bajo y llama a onPress', () => {
    const onPress = vi.fn();
    render(<ActionLink onPress={onPress}>editar</ActionLink>);

    fireEvent.click(screen.getByRole('button', { name: '_editar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('BlockButton agrega la barra final y, cargando, no se puede apretar', () => {
    const onPress = vi.fn();
    render(
      <BlockButton loading onPress={onPress}>
        Crear cuenta
      </BlockButton>
    );

    const button = screen.getByRole('button', { name: 'Crear cuenta /' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Tabs', () => {
  const items = [
    { value: 'available', label: 'Disponible', count: 0 },
    { value: 'pending', label: 'Pendiente' },
    { value: 'blocked', label: 'Bloqueado', disabled: true },
    { value: 'add', label: 'Añadir amigo' },
  ];

  it('marca la pestaña activa y cambia al hacer click', () => {
    const onChange = vi.fn();
    render(<Tabs label="Amigos" items={items} value="available" onChange={onChange} />);

    expect(screen.getByRole('tablist', { name: 'Amigos' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Disponible (0)' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Pendiente' }));
    expect(onChange).toHaveBeenCalledWith('pending');
  });

  it('se recorre con las flechas, salteando las deshabilitadas y dando la vuelta', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} value="pending" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Pendiente' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('add');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Pendiente' }), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('available');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Pendiente' }), { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('add');
  });

  it('solo la pestaña activa queda en el orden de tabulación', () => {
    render(<Tabs items={items} value="pending" onChange={() => undefined} />);

    const tabbable = screen.getAllByRole('tab').filter((t) => t.tabIndex === 0);
    expect(tabbable.map((t) => t.textContent)).toEqual(['Pendiente']);
  });
});

describe('SectionLabel', () => {
  it('lleva la barra final y, colapsable, informa si está abierta', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <SectionLabel collapsible open onToggle={onToggle}>
        Canal de texto
      </SectionLabel>
    );

    const toggle = screen.getByRole('button', { name: /Canal de texto \// });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <SectionLabel collapsible open={false} onToggle={onToggle}>
        Canal de texto
      </SectionLabel>
    );
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false');
  });

  it('sin colapsar es un título', () => {
    render(<SectionLabel>Mensajes directos</SectionLabel>);
    expect(screen.getByRole('heading', { name: 'Mensajes directos /' })).toBeTruthy();
  });
});

describe('DisplayText', () => {
  it('como navegación es un botón que marca la vista actual', () => {
    const onPress = vi.fn();
    render(
      <>
        <DisplayText active onPress={onPress}>Iniciar sesión</DisplayText>
        <DisplayText onPress={onPress}>Registrarse</DisplayText>
      </>
    );

    expect(screen.getByRole('button', { name: 'Iniciar sesión' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Registrarse' }).getAttribute('aria-current')).toBeNull();
  });

  it('la marca de agua es decorativa (no la leen los lectores de pantalla)', () => {
    const { container } = render(<DisplayText variant="watermark">amigos</DisplayText>);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('SquareAvatar', () => {
  it('sin foto muestra las iniciales con el nombre accesible', () => {
    render(<SquareAvatar user={{ displayName: 'Iñaki Ibarrolaza', username: 'inaki' }} status="online" />);

    expect(screen.getByRole('img', { name: 'Iñaki Ibarrolaza' }).textContent).toBe('II');
    expect(screen.getByLabelText('Conectado')).toBeTruthy();
  });

  it('si la foto no carga, vuelve a las iniciales', () => {
    render(<SquareAvatar user={{ displayName: 'Mora', username: 'mora', avatar: 'https://x/avatar.png' }} />);

    fireEvent.error(screen.getByRole('img', { name: 'Mora' }));
    expect(screen.getByRole('img', { name: 'Mora' }).textContent).toBe('MO');
  });
});

describe('Toast, EmptyState y Skeleton', () => {
  it('Toast de error es una alerta con su acción', () => {
    const onPress = vi.fn();
    render(<Toast message="No se pudo enviar" tone="error" action={{ label: 'reintentar', onPress }} />);

    expect(screen.getByRole('alert').textContent).toContain('No se pudo enviar/');
    fireEvent.click(screen.getByText('_reintentar'));
    expect(onPress).toHaveBeenCalled();
  });

  it('EmptyState muestra la bajada con barra inicial', () => {
    render(<EmptyState title="por ahora todo está tranquilo" hint="cuando un amigo empiece una actividad aparecerá aquí" />);
    expect(screen.getByText('/ cuando un amigo empiece una actividad aparecerá aquí')).toBeTruthy();
  });

  it('Skeleton anuncia que está cargando', () => {
    render(<Skeleton lines={4} label="Cargando mensajes" />);
    expect(screen.getByRole('status', { name: 'Cargando mensajes' }).children).toHaveLength(4);
  });
});

describe('useMotionPreset', () => {
  afterEach(() => {
    vi.doUnmock('motion/react');
    vi.resetModules();
  });

  it('con movimiento reducido todos los presets son un fundido de 150 ms', async () => {
    // ../motion ya lo cargó el import del catálogo: se vuelve a cargar con motion simulado
    vi.resetModules();
    vi.doMock('motion/react', async (importOriginal) => ({
      ...(await importOriginal<typeof import('motion/react')>()),
      useReducedMotion: () => true,
    }));
    const { useMotionPreset } = await import('../motion');

    const { result } = renderHook(() => useMotionPreset('curtain'));
    // Arranca en 0.01 y no en 0: así Chrome cuenta lo que entra como pintado (FCP / LCP)
    expect(result.current.variants.hidden).toEqual({ opacity: 0.01 });
    expect(result.current.transition).toMatchObject({ duration: 0.15 });
  });

  it('sin preferencia, curtain baja desde arriba', async () => {
    const { useMotionPreset } = await import('../motion');

    const { result } = renderHook(() => useMotionPreset('curtain'));
    expect(result.current.variants.hidden).toEqual({ y: '-100%' });
  });
});
