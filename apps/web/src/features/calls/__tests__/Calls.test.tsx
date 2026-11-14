import { useContext } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  callEndMessage,
  setApiMock,
  useSession,
  type Call,
  type CallEndReason,
  type CallRole,
  type PrivateCallState,
  type useVoiceRoom,
} from '@discordia/core';
import { USERS } from '@discordia/core/testing';
import { useUIStore } from '../../../app/uiStore';
import { UsersContext } from '../../../app/usersContext';
import { renderWithDm } from '../../../testing/renderWithDm';
import { a11yViolations } from '../../../testing/axe';
import { HomePanel } from '../../friends/HomePanel';
import { VoiceContext } from '../../voice/voiceContext';
import { CallContext, type CallContextValue } from '../callContext';
import { CallProvider } from '../CallProvider';
import { CallNotices, CALL_END_NOTICE_MS } from '../CallNotices';
import { CallControlsPanel } from '../CallControls';
import { formatCallDuration } from '../callDuration';

/** El inicio (con el DM de `userId` abierto) y los avisos globales de la llamada, contra el mock de core. */
function renderDm(userId: string, options?: Parameters<typeof renderWithDm>[1]) {
  const slot = document.createElement('div');
  document.body.appendChild(slot);
  const result = renderWithDm(
    <>
      <HomePanel sidebarContainer={slot} />
      <CallControlsPanel />
      <CallNotices />
    </>,
    options
  );
  act(() => useUIStore.getState().setSelectedDm({ type: 'chat', userId }));
  return result;
}

const callButton = () => screen.queryByRole('button', { name: /^Llamar a / });
const callPanel = (name: string) => screen.findByRole('region', { name: `Llamada con ${name}` });
const toast = () => useUIStore.getState().toast?.message;

describe('llamadas privadas', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    document.title = 'Discordia Web';
    setApiMock(null);
    useSession.setState({ status: 'unauthenticated' });
    vi.useRealTimers();
  });

  describe('botón llamar', () => {
    it('aparece en un DM con una conversación abierta (canCall)', async () => {
      renderDm('u1');
      await screen.findByRole('combobox', { name: 'Enviar mensaje a @Sofia Rossi' });
      expect(callButton()).toBeTruthy();
    });

    it('no aparece con alguien bloqueado ni esperando respuesta', async () => {
      renderDm('u6');
      await screen.findByText('Desbloqueá para escribir.');
      expect(callButton()).toBeNull();

      cleanup();
      renderDm('u4');
      await screen.findByText('Esperando respuesta.');
      expect(callButton()).toBeNull();
    });
  });

  describe('llamar', () => {
    it('llamando…, en llamada con la duración y cortar: "llamada finalizada"', async () => {
      renderDm('u1', { answerDelayMs: 30 });
      fireEvent.click(await screen.findByRole('button', { name: /^Llamar a / }));

      const panel = await callPanel('Sofia Rossi');
      expect(within(panel).getByRole('status').textContent).toBe('llamando…/');
      expect(within(panel).getByRole('listitem', { name: 'Sofia Rossi, sonando' })).toBeTruthy();
      // Mientras está en la llamada, cortar está en la vista y en la barra lateral, y no se ofrece volver a llamar
      expect(callButton()).toBeNull();
      expect(screen.getByRole('group', { name: 'Llamada privada en curso' }).textContent).toContain('llamando…/');

      await waitFor(() => expect(within(panel).getByRole('status').textContent).toMatch(/^en llamada\/ 00:0\d$/));
      expect(within(panel).getByRole('listitem', { name: 'Sofia Rossi' })).toBeTruthy();

      fireEvent.click(within(panel).getByRole('button', { name: 'Cortar llamada' }));

      expect(await screen.findByText(/llamada finalizada\//)).toBeTruthy();
      expect(screen.queryByRole('region', { name: 'Llamada con Sofia Rossi' })).toBeNull();
      expect(screen.queryByRole('group', { name: 'Llamada privada en curso' })).toBeNull();
      expect(callButton()).toBeTruthy();
    });

    it('rechazada: "no puede atender ahora"', async () => {
      renderDm('u2', { answerDelayMs: 30 });
      fireEvent.click(await screen.findByRole('button', { name: /^Llamar a / }));
      expect(await screen.findByText(/no puede atender ahora\//)).toBeTruthy();
    });

    it('sin respuesta: "no respondió"', async () => {
      renderDm('u1', { callAnswers: { u1: 'none' }, ringMs: 50 });
      fireEvent.click(await screen.findByRole('button', { name: /^Llamar a / }));
      expect(await screen.findByText(/no respondió\//)).toBeTruthy();
    });

    it('cancelar mientras suena: "llamada cancelada"', async () => {
      renderDm('u1', { answerDelayMs: 10_000 });
      fireEvent.click(await screen.findByRole('button', { name: /^Llamar a / }));
      fireEvent.click(within(await callPanel('Sofia Rossi')).getByRole('button', { name: 'Cancelar llamada' }));
      expect(await screen.findByText(/llamada cancelada\//)).toBeTruthy();
    });

    it('ocupado: avisa "está en otra llamada" y no abre la vista', async () => {
      renderDm('u1', { callAnswers: { u1: 'busy' } });
      fireEvent.click(await screen.findByRole('button', { name: /^Llamar a / }));
      await waitFor(() => expect(toast()).toBe('está en otra llamada'));
      expect(screen.queryByRole('region', { name: 'Llamada con Sofia Rossi' })).toBeNull();
    });
  });

  describe('llamada entrante', () => {
    it('se ve en cualquier vista, cambia el título y atender abre el chat con la llamada', async () => {
      const { mock } = renderDm('u1');
      await screen.findByRole('combobox', { name: 'Enviar mensaje a @Sofia Rossi' });

      act(() => void mock.simulateIncomingCall('u2'));

      const notice = await screen.findByRole('region', { name: 'Llamada entrante de Martín Méndez' });
      expect(within(notice).getByText('te está llamando/')).toBeTruthy();
      expect(document.title).toBe('llamada entrante/ Martín Méndez');
      expect(await a11yViolations(notice)).toEqual([]);

      fireEvent.click(within(notice).getByRole('button', { name: 'Atender /' }));

      await waitFor(() => expect(useUIStore.getState().selectedDm).toEqual({ type: 'chat', userId: 'u2' }));
      const panel = await callPanel('Martín Méndez');
      expect(within(panel).getByRole('status').textContent).toMatch(/^en llamada\//);
      // Sale con su animación
      await waitFor(() => expect(screen.queryByRole('region', { name: /Llamada entrante/ })).toBeNull());
      expect(document.title).toBe('Discordia Web');

      // El otro corta
      act(() => mock.simulateRemoteHangUp());
      expect(await screen.findByText(/llamada finalizada\//)).toBeTruthy();
    });

    it('rechazar la saca sin aviso de fin', async () => {
      const { mock } = renderDm('u1');
      await screen.findByRole('combobox', { name: 'Enviar mensaje a @Sofia Rossi' });
      act(() => void mock.simulateIncomingCall('u2'));

      const notice = await screen.findByRole('region', { name: 'Llamada entrante de Martín Méndez' });
      fireEvent.click(within(notice).getByRole('button', { name: '_rechazar' }));

      await waitFor(() => expect(screen.queryByRole('region', { name: /Llamada entrante/ })).toBeNull());
      expect(await mock.getCurrentCall()).toBeNull();
      expect(screen.queryByText(/llamada finalizada|llamada perdida/)).toBeNull();
    });

    it('si quien llama corta antes de que atienda: "llamada perdida"', async () => {
      const { mock } = renderDm('u1');
      await screen.findByRole('combobox', { name: 'Enviar mensaje a @Sofia Rossi' });
      act(() => void mock.simulateIncomingCall('u2'));
      await screen.findByRole('region', { name: 'Llamada entrante de Martín Méndez' });

      act(() => mock.simulateRemoteHangUp());

      expect(await screen.findByText(/llamada perdida\//)).toBeTruthy();
      await waitFor(() => expect(screen.queryByRole('region', { name: /Llamada entrante/ })).toBeNull());
    });
  });
});

// ── Aviso de fin, con cada motivo y rol, y la confirmación si está en un canal de voz ──

const CALL: Call = {
  id: 'c1',
  conversationId: 'dm-u1',
  callerId: 'u0',
  calleeId: 'u1',
  status: 'ended',
  createdAt: '2026-11-12T10:00:00.000Z',
  expiresAt: '2026-11-12T10:00:30.000Z',
};

function fakeRoom(channelId: string | null = null) {
  return {
    channelId,
    roomId: channelId,
    participants: [],
    connectionState: 'disconnected',
    isMuted: false,
    isDeafened: false,
    join: vi.fn(),
    leave: vi.fn(async () => {}),
    toggleMute: vi.fn(),
    toggleDeafen: vi.fn(),
  } as unknown as ReturnType<typeof useVoiceRoom>;
}

function renderNotices(state: PrivateCallState, overrides: Partial<CallContextValue> = {}) {
  const value: CallContextValue = {
    state,
    peerId: 'u1',
    call: vi.fn(),
    accept: vi.fn(async () => {}),
    decline: vi.fn(async () => {}),
    hangUp: vi.fn(async () => {}),
    dismiss: vi.fn(),
    ...overrides,
  };
  const voice = { room: fakeRoom(), presence: {}, join: async () => {}, disconnect: () => {}, isSwitching: () => false, toggleCamera: async () => {} };
  render(
    <UsersContext.Provider value={{ usersMap: USERS, userOrFallback: (id) => USERS[id] }}>
      <VoiceContext.Provider value={voice}>
        <CallContext.Provider value={value}>
          <CallNotices />
        </CallContext.Provider>
      </VoiceContext.Provider>
    </UsersContext.Provider>
  );
  return value;
}

describe('aviso de fin de llamada', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const cases: [CallEndReason, CallRole, string][] = [
    ['declined', 'caller', 'no puede atender ahora'],
    ['missed', 'caller', 'no respondió'],
    ['canceled', 'caller', 'llamada cancelada'],
    ['ended', 'caller', 'llamada finalizada'],
    ['unavailable', 'caller', 'no se pudo completar la llamada'],
    ['missed', 'callee', 'llamada perdida'],
    ['canceled', 'callee', 'llamada perdida'],
    ['ended', 'callee', 'llamada finalizada'],
    ['unavailable', 'callee', 'no se pudo completar la llamada'],
  ];

  it.each(cases)('%s (%s): "%s"', (reason, role, text) => {
    expect(callEndMessage(reason, role)).toBe(text);
    renderNotices({ status: 'ended', conversationId: 'dm-u1', call: { ...CALL, endReason: reason }, role, reason, finished: ['c1'] });
    expect(screen.getByRole('status').textContent).toBe(`Sofia Rossi / ${text}/_cerrar`);
  });

  it('_cerrar lo descarta, y si no se va solo', () => {
    vi.useFakeTimers();
    const ended: PrivateCallState = { status: 'ended', conversationId: 'dm-u1', call: CALL, role: 'caller', reason: 'ended', finished: ['c1'] };
    const { dismiss } = renderNotices(ended);

    fireEvent.click(screen.getByRole('button', { name: '_cerrar' }));
    expect(dismiss).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(CALL_END_NOTICE_MS));
    expect(dismiss).toHaveBeenCalledTimes(2);
  });

  it('entrante estando en un canal de voz: avisa que atender lo saca', () => {
    const incoming: PrivateCallState = {
      status: 'incoming',
      conversationId: 'dm-u1',
      call: { ...CALL, status: 'ringing', callerId: 'u1', calleeId: 'u0' },
      role: 'callee',
      accepting: false,
      finished: [],
    };
    const value: CallContextValue = {
      state: incoming,
      peerId: 'u1',
      call: vi.fn(),
      accept: vi.fn(async () => {}),
      decline: vi.fn(async () => {}),
      hangUp: vi.fn(async () => {}),
      dismiss: vi.fn(),
    };
    const voice = { room: fakeRoom('v1'), presence: {}, join: async () => {}, disconnect: () => {}, isSwitching: () => true, toggleCamera: async () => {} };
    render(
      <UsersContext.Provider value={{ usersMap: USERS, userOrFallback: (id) => USERS[id] }}>
        <VoiceContext.Provider value={voice}>
          <CallContext.Provider value={value}>
            <CallNotices />
          </CallContext.Provider>
        </VoiceContext.Provider>
      </UsersContext.Provider>
    );

    const notice = screen.getByRole('region', { name: 'Llamada entrante de Sofia Rossi' });
    expect(notice.textContent).toContain('atender te saca del canal de voz');
    // Con el foco libre, va a atender: se contesta con Enter
    expect(document.activeElement).toBe(within(notice).getByRole('button', { name: 'Atender /' }));
    fireEvent.click(within(notice).getByRole('button', { name: '_rechazar' }));
    expect(value.decline).toHaveBeenCalled();
  });
});

describe('llamar estando en un canal de voz', () => {
  afterEach(() => cleanup());

  it('pide confirmación antes de llamar (llamar saca del canal)', () => {
    useSession.setState({ status: 'unauthenticated' });
    useUIStore.setState({ activeModal: null, confirm: { action: null, targetName: '', targetDetail: '' } });
    const client = new QueryClient();
    client.setQueryData(['servers'], [{ id: 's1', categories: [{ channels: [{ id: 'v1', name: 'general-voz' }] }] }]);
    const voice = { room: fakeRoom('v1'), presence: {}, join: async () => {}, disconnect: () => {}, isSwitching: () => true, toggleCamera: async () => {} };
    let ctx: CallContextValue | null = null;
    const Capture = () => {
      ctx = useContext(CallContext);
      return null;
    };
    render(
      <QueryClientProvider client={client}>
        <VoiceContext.Provider value={voice}>
          <CallProvider>
            <Capture />
          </CallProvider>
        </VoiceContext.Provider>
      </QueryClientProvider>
    );

    act(() => ctx!.call('dm-u1', 'Sofia Rossi'));

    const { activeModal, confirm } = useUIStore.getState();
    expect(activeModal).toBe('confirm-action');
    expect(confirm).toMatchObject({ action: 'start-call', targetName: 'Sofia Rossi', targetDetail: 'general-voz' });
    expect(ctx!.state.status).toBe('idle');
  });
});

describe('formatCallDuration', () => {
  it('mm:ss y, pasada la hora, h:mm:ss', () => {
    expect(formatCallDuration(0)).toBe('00:00');
    expect(formatCallDuration(65_400)).toBe('01:05');
    expect(formatCallDuration(3_725_000)).toBe('1:02:05');
  });
});
