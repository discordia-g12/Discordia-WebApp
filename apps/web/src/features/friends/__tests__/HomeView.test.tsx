import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ApiError, setApiMock, useSession } from '@discordia/core';
import { useUIStore } from '../../../app/uiStore';
import { renderWithDm } from '../../../testing/renderWithDm';
import { HomePanel } from '../HomePanel';
import { HomeView } from '../HomeView';

/** La lista de DMs va por portal a la barra lateral del layout: en el test, a un div propio. */
function renderHome(options?: Parameters<typeof renderWithDm>[1]) {
  const slot = document.createElement('div');
  document.body.appendChild(slot);
  const result = renderWithDm(<HomePanel sidebarContainer={slot} />, options);
  return { sidebar: within(slot), ...result };
}

const open = async (sidebar: ReturnType<typeof within>, name: RegExp) => fireEvent.click(await sidebar.findByRole('button', { name }));
/** La sección Amigos: los nombres también están en la barra lateral. */
const friendsSection = () => within(screen.getByRole('region', { name: 'Lista de amigos' }));
const toast = () => useUIStore.getState().toast?.message;
/** Confirma el diálogo que abrió la acción: lo muestra GlobalModals, que acá no está montado. */
const confirmDialog = () => act(async () => useUIStore.getState().confirm.onConfirm?.());

describe('HomeView', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    setApiMock(null);
    useSession.setState({ status: 'unauthenticated' });
  });

  describe('lista de chats', () => {
    it('muestra conversaciones y solicitudes como un chat más, con presencia y no leídos', async () => {
      const { sidebar } = renderHome();

      const sofia = await sidebar.findByRole('button', { name: /Sofia Rossi/ });
      await waitFor(() => expect(sofia.textContent).toMatch(/^Sofia RossiConectado\//));
      expect(sofia.textContent).toContain('1 sin leer');
      expect((await sidebar.findByRole('button', { name: /Emma Watson/ })).textContent).toContain('Solicitud de mensaje/');
      expect((await sidebar.findByRole('button', { name: /Lucas Silva/ })).textContent).toContain('Esperando respuesta/');
      expect((await sidebar.findByRole('button', { name: /Valentina Chen/ })).textContent).toContain('Solicitud de amistad/');
    });

    it('busca por nombre y muestra un vacío si no hay coincidencias', async () => {
      const { sidebar } = renderHome();
      await sidebar.findByRole('button', { name: /Sofia Rossi/ });

      fireEvent.change(sidebar.getByLabelText('Buscar conversaciones'), { target: { value: 'zzz' } });

      expect(sidebar.queryByRole('button', { name: /Sofia Rossi/ })).toBeNull();
      expect(sidebar.getByText('sin resultados')).toBeTruthy();
    });

    it('muestra el error de carga con reintentar', async () => {
      const slot = document.createElement('div');
      document.body.appendChild(slot);
      renderWithDm(<HomePanel sidebarContainer={slot} />, {}, (mock) => {
        mock.getConversations = vi.fn().mockRejectedValue(new ApiError({ status: 500, detail: 'x' }));
      });

      expect(await within(slot).findByText('no se pudieron cargar')).toBeTruthy();
      expect(within(slot).getByRole('button', { name: '_reintentar' })).toBeTruthy();
    });

    it('un mensaje que llega por el inbox suma un no leído en la lista', async () => {
      const { sidebar, mock } = renderHome();
      const martin = await sidebar.findByRole('button', { name: /Martín Méndez/ });
      expect(martin.textContent).not.toContain('sin leer');

      act(() => void mock.simulateIncomingMessage('u2', 'hola'));

      await waitFor(() => expect(sidebar.getByRole('button', { name: /Martín Méndez/ }).textContent).toContain('1 sin leer'));
    });
  });

  describe('sección Amigos', () => {
    it('Disponible y Todos con datos reales, y Todos con buscador', async () => {
      renderHome();

      fireEvent.click(await screen.findByRole('tab', { name: 'Todos (2)' }));
      expect(await friendsSection().findByText('Sofia Rossi')).toBeTruthy();
      expect(friendsSection().getByText('Martín Méndez')).toBeTruthy();

      fireEvent.change(screen.getByLabelText('Buscar amigos'), { target: { value: 'sofi' } });
      expect(friendsSection().getByText('Sofia Rossi')).toBeTruthy();
      expect(friendsSection().queryByText('Martín Méndez')).toBeNull();
      expect(screen.queryByRole('button', { name: '_llamar' })).toBeNull();
    });

    it('_mensaje abre el chat con ese amigo', async () => {
      renderHome();
      fireEvent.click(await screen.findByRole('tab', { name: 'Todos (2)' }));
      const row = (await friendsSection().findByText('Sofia Rossi')).closest('li') as HTMLElement;

      fireEvent.click(within(row).getByRole('button', { name: '_mensaje' }));

      expect(useUIStore.getState().selectedDm).toEqual({ type: 'chat', userId: 'u1' });
      expect(await screen.findByRole('log', { name: 'Mensajes de Sofia Rossi' })).toBeTruthy();
    });

    it('Pendiente: acepta las recibidas y cancela las enviadas', async () => {
      renderHome();
      fireEvent.click(await screen.findByRole('tab', { name: 'Pendiente (2)' }));

      const incoming = (await friendsSection().findByText('Valentina Chen')).closest('li') as HTMLElement;
      expect(incoming.textContent).toContain('Te vi en el server de la materia');
      const outgoing = friendsSection().getByText('Lucas Silva').closest('li') as HTMLElement;
      expect(within(outgoing).queryByRole('button', { name: '_aceptar' })).toBeNull();

      fireEvent.click(within(outgoing).getByRole('button', { name: '_cancelar' }));
      await waitFor(() => expect(friendsSection().queryByText('Lucas Silva')).toBeNull());

      fireEvent.click(within(incoming).getByRole('button', { name: '_aceptar' }));
      expect(await screen.findByRole('tab', { name: 'Todos (3)' })).toBeTruthy();
      expect(await screen.findByText('no hay solicitudes pendientes')).toBeTruthy();
    });

    it('Bloqueado lista a los bloqueados y permite desbloquear', async () => {
      renderHome();
      fireEvent.click(await screen.findByRole('tab', { name: 'Bloqueado' }));

      fireEvent.click(await screen.findByRole('button', { name: '_desbloquear' }));

      expect(await screen.findByText('no bloqueaste a nadie')).toBeTruthy();
    });

    it('Añadir amigo: pide usuario o email y descripción opcional', async () => {
      const { mock } = renderHome();
      const send = vi.spyOn(mock, 'sendFriendRequest');
      fireEvent.click(await screen.findByRole('tab', { name: 'Añadir amigo' }));

      const submit = screen.getByRole('button', { name: 'Enviar solicitud /' }) as HTMLButtonElement;
      expect(submit.disabled).toBe(true);

      fireEvent.change(screen.getByLabelText('nombre de usuario o email'), { target: { value: 'emma_w' } });
      fireEvent.change(screen.getByLabelText('descripción (opcional)'), { target: { value: 'de la facu' } });
      fireEvent.click(submit);

      expect((await screen.findByRole('status')).textContent).toContain('Tu solicitud de amistad a emma_w fue enviada');
      expect(send).toHaveBeenCalledWith({ target: 'emma_w', message: 'de la facu' });
    });

    it('por email la respuesta es la misma exista o no: no confirma nada', async () => {
      renderHome();
      fireEvent.click(await screen.findByRole('tab', { name: 'Añadir amigo' }));

      fireEvent.change(screen.getByLabelText('nombre de usuario o email'), { target: { value: 'nadie@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud /' }));

      expect((await screen.findByRole('status')).textContent).toContain('fue enviada');
    });

    it('muestra los rechazos del backend en el campo', async () => {
      renderHome();
      fireEvent.click(await screen.findByRole('tab', { name: 'Añadir amigo' }));
      const input = screen.getByLabelText('nombre de usuario o email');

      fireEvent.change(input, { target: { value: 'noexiste' } });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud /' }));
      expect(await screen.findByText(/No encontramos a "noexiste"/)).toBeTruthy();

      fireEvent.change(input, { target: { value: 'sofiar' } });
      fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud /' }));
      expect(await screen.findByText(/Ya son amigos/)).toBeTruthy();
    });

    it('el + de mensajes directos vuelve a Amigos, en añadir amigo', async () => {
      const { sidebar } = renderHome();
      await open(sidebar, /Sofia Rossi/);
      await screen.findByRole('log', { name: 'Mensajes de Sofia Rossi' });

      fireEvent.click(sidebar.getByRole('button', { name: 'Nuevo mensaje directo' }));

      expect(useUIStore.getState().selectedDm).toBeNull();
      expect((await screen.findByRole('tab', { name: 'Añadir amigo' })).getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('solicitud de amistad', () => {
    it('tarjeta con título, descripción y chiste; aceptar abre el chat', async () => {
      const { sidebar } = renderHome();
      await open(sidebar, /Valentina Chen/);

      const card = await screen.findByRole('article', { name: 'Valentina Chen quiere ser tu amigo' });
      expect(card.textContent).toContain('Te vi en el server de la materia');
      expect(within(card).getByText(/^\/ /).textContent?.length).toBeGreaterThan(10);

      fireEvent.click(within(card).getByRole('button', { name: 'Aceptar /' }));

      await waitFor(() => expect(useUIStore.getState().selectedDm).toEqual({ type: 'chat', userId: 'u5' }));
      expect(toast()).toContain('Ahora sos amigo de Valentina Chen');
      await waitFor(() => expect(sidebar.queryByRole('button', { name: /Valentina Chen/ })).toBeNull());
    });

    it('rechazar la saca de la lista y vuelve a Amigos', async () => {
      const { sidebar } = renderHome();
      await open(sidebar, /Valentina Chen/);

      fireEvent.click(await screen.findByRole('button', { name: '_rechazar' }));

      await waitFor(() => expect(useUIStore.getState().selectedDm).toBeNull());
      await waitFor(() => expect(sidebar.queryByRole('button', { name: /Valentina Chen/ })).toBeNull());
    });
  });

  describe('solicitud de mensaje', () => {
    it('preview sin composer; aceptar libera el chat y no los hace amigos', async () => {
      const { sidebar, mock } = renderHome();
      await open(sidebar, /Emma Watson/);

      const card = await screen.findByRole('article', { name: 'Emma Watson quiere hablar con vos' });
      expect(card.textContent).toContain('¿Pudiste ver la nueva paleta de colores?');
      expect(screen.queryByRole('combobox')).toBeNull();

      fireEvent.click(within(card).getByRole('button', { name: 'Aceptar /' }));

      expect(await screen.findByPlaceholderText('Enviar mensaje a @Emma Watson')).toBeTruthy();
      expect((await mock.getFriends()).map((f) => f.id)).not.toContain('u3');
      expect(screen.getByRole('button', { name: 'Agregar a Emma Watson como amigo' })).toBeTruthy();
    });

    it('rechazar la saca de la lista', async () => {
      const { sidebar } = renderHome();
      await open(sidebar, /Emma Watson/);

      fireEvent.click(await screen.findByRole('button', { name: '_rechazar' }));

      await waitFor(() => expect(useUIStore.getState().selectedDm).toBeNull());
      await waitFor(() => expect(sidebar.queryByRole('button', { name: /Emma Watson/ })).toBeNull());
    });

    it('bloquear rechaza primero y después bloquea', async () => {
      const { sidebar, mock } = renderHome();
      const decline = vi.spyOn(mock, 'declineConversation');
      const block = vi.spyOn(mock, 'blockUser');
      await open(sidebar, /Emma Watson/);

      fireEvent.click(await screen.findByRole('button', { name: '_bloquear' }));
      expect(useUIStore.getState().confirm.action).toBe('block-user');
      await confirmDialog();

      expect(decline).toHaveBeenCalledWith('dm-u3');
      expect(block).toHaveBeenCalledWith('u3');
      expect(decline.mock.invocationCallOrder[0]).toBeLessThan(block.mock.invocationCallOrder[0]);
      expect(useUIStore.getState().selectedDm).toBeNull();
      await waitFor(() => expect(sidebar.queryByRole('button', { name: /Emma Watson/ })).toBeNull());
    });

    it('agregar amigo es independiente de aceptar el mensaje', async () => {
      const { sidebar, mock } = renderHome();
      await open(sidebar, /Emma Watson/);

      fireEvent.click(await screen.findByRole('button', { name: '_agregar amigo' }));

      await waitFor(async () => expect((await mock.getFriendRequests()).outgoing.map((r) => r.user.id)).toContain('u3'));
      expect(screen.getByRole('article', { name: 'Emma Watson quiere hablar con vos' })).toBeTruthy();
    });

    it('quien rechazó y escribe se arrepiente: la conversación se acepta antes de enviar', async () => {
      const { sidebar, mock } = renderHome();
      const accept = vi.spyOn(mock, 'acceptConversation');
      await open(sidebar, /Emma Watson/);
      fireEvent.click(await screen.findByRole('button', { name: '_rechazar' }));
      await waitFor(() => expect(useUIStore.getState().selectedDm).toBeNull());

      act(() => useUIStore.getState().setSelectedDm({ type: 'chat', userId: 'u3' }));
      const input = await screen.findByPlaceholderText('Enviar mensaje a @Emma Watson');
      fireEvent.change(input, { target: { value: 'perdón, sí' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => expect(accept).toHaveBeenCalledWith('dm-u3'));
      expect(await sidebar.findByRole('button', { name: /Emma Watson/ })).toBeTruthy();
    });
  });

  describe('chat de DM', () => {
    it('envía entre amigos y marca leído al abrir', async () => {
      const { sidebar, mock } = renderHome();
      const markRead = vi.spyOn(mock, 'markChannelRead');
      await open(sidebar, /Sofia Rossi/);

      const input = await screen.findByPlaceholderText('Enviar mensaje a @Sofia Rossi');
      fireEvent.change(input, { target: { value: 'hola sofi' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(await within(screen.getByRole('log')).findByText('hola sofi')).toBeTruthy();
      await waitFor(() => expect(markRead).toHaveBeenCalled(), { timeout: 2500 });
      await waitFor(() => expect(sidebar.getByRole('button', { name: /Sofia Rossi/ }).textContent).not.toContain('sin leer'));
    });

    it('lo que llega con el chat abierto se ve y no suma no leídos', async () => {
      const { sidebar, mock } = renderHome();
      await open(sidebar, /Martín Méndez/);
      await screen.findByPlaceholderText('Enviar mensaje a @Martín Méndez');

      act(() => void mock.simulateIncomingMessage('u2', 'estás?'));

      expect(await within(screen.getByRole('log')).findByText('estás?')).toBeTruthy();
      expect(sidebar.getByRole('button', { name: /Martín Méndez/ }).textContent).not.toContain('sin leer');
    });

    it('esperando respuesta: quien inició no puede mandar otro', async () => {
      const { sidebar } = renderHome();
      await open(sidebar, /Lucas Silva/);

      expect(await screen.findByText('Esperando respuesta.')).toBeTruthy();
      expect(screen.queryByRole('combobox')).toBeNull();
      expect(screen.getByRole('button', { name: 'Cancelar solicitud de amistad' })).toBeTruthy();
    });

    it('bloqueado: historial con "desbloqueá para escribir", y desbloquear lo libera', async () => {
      const { sidebar } = renderHome();
      await open(sidebar, /Daniel Park/);

      expect(await screen.findByText('Desbloqueá para escribir.')).toBeTruthy();
      expect(await within(screen.getByRole('log')).findByText('Nos vemos.')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'Desbloquear a Daniel Park' }));

      expect(await screen.findByPlaceholderText('Enviar mensaje a @Daniel Park')).toBeTruthy();
    });

    it('bloquear desde el chat pide confirmación y conserva el historial', async () => {
      const { sidebar } = renderHome();
      await open(sidebar, /Sofia Rossi/);

      fireEvent.click(await screen.findByRole('button', { name: 'Más opciones' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Bloquear a Sofia Rossi' }));
      await confirmDialog();

      expect(await screen.findByText('Desbloqueá para escribir.')).toBeTruthy();
      expect(screen.getByRole('log')).toBeTruthy();
    });

    it('quien fue bloqueado ve un error genérico de entrega, nunca el bloqueo', async () => {
      const { sidebar } = renderHome({ blockedBy: ['u1'] });
      await open(sidebar, /Sofia Rossi/);

      expect(await screen.findByText('No se pudo entregar tu mensaje.')).toBeTruthy();
      expect(screen.queryByText(/te bloque/i)).toBeNull();
      expect(screen.queryByText('Desbloqueá para escribir.')).toBeNull();
    });

    it('sin conversación: no crea nada al abrir, no ofrece adjuntar y el primer mensaje la crea', async () => {
      const { sidebar, mock } = renderHome();
      await sidebar.findByRole('button', { name: /Sofia Rossi/ });
      const before = (await mock.getConversations()).length;

      act(() => useUIStore.getState().setSelectedDm({ type: 'chat', userId: 'u5' }));
      const input = await screen.findByPlaceholderText('Enviar mensaje a @Valentina Chen');
      expect((await mock.getConversations()).length).toBe(before);
      expect(screen.queryByRole('button', { name: 'Adjuntar archivo' })).toBeNull();

      fireEvent.change(input, { target: { value: 'hola valen' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(await screen.findByText('Esperando respuesta.')).toBeTruthy();
      expect((await mock.getConversations()).length).toBe(before + 1);
    });

    it('si el envío choca con un bloqueo, avisa con el error genérico y cierra el composer', async () => {
      const { sidebar, mock } = renderHome();
      await open(sidebar, /Sofia Rossi/);
      const input = await screen.findByPlaceholderText('Enviar mensaje a @Sofia Rossi');
      const forbidden = new ApiError({ status: 403, code: 'DM_NOT_DELIVERABLE', detail: 'DM_NOT_DELIVERABLE' });
      mock.sendMessage = vi.fn().mockRejectedValue(forbidden);
      mock.getConversationWith = vi.fn().mockResolvedValue({ conversation: null, canMessage: false });

      fireEvent.change(input, { target: { value: 'hola' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => expect(toast()).toBe('No se pudo entregar tu mensaje.'));
      expect(await screen.findByText('No se pudo entregar tu mensaje.')).toBeTruthy();
    });

    it('muestra error con reintentar si no puede abrir la conversación', async () => {
      const { sidebar, mock } = renderHome();
      mock.getConversationWith = vi.fn().mockRejectedValueOnce(new ApiError({ status: 503, detail: 'x' }));
      await open(sidebar, /Sofia Rossi/);

      expect(await screen.findByText('no se pudo abrir la conversación')).toBeTruthy();
      mock.getConversationWith = vi.fn().mockResolvedValue({ conversation: null, canMessage: true });
      fireEvent.click(screen.getByRole('button', { name: '_reintentar' }));

      expect(await screen.findByRole('log', { name: 'Mensajes de Sofia Rossi' })).toBeTruthy();
    });
  });

  it('muestra ACTIVO AHORA con su estado vacío', async () => {
    renderHome();

    const aside = await screen.findByRole('complementary', { name: 'Activo ahora' });
    expect(within(aside).getByText('por ahora todo está tranquilo')).toBeTruthy();
  });

  it('HomeView sin barra lateral (mobile web) muestra el chat abierto', async () => {
    renderWithDm(<HomeView currentUserId="u0" selected={{ type: 'chat', userId: 'u1' }} onSelect={vi.fn()} onOpenUserProfile={vi.fn()} />);

    expect(await screen.findByRole('log', { name: 'Mensajes de Sofia Rossi' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Mensajes directos /' })).toBeNull();
  });
});
