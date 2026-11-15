import { useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { callErrorMessage, useConversationsQuery, usePrivateCall } from '@discordia/core';
import type { Server } from '../../types';
import { showToast, useUIStore } from '../../app/uiStore';
import { openDirectChat } from '../friends/openDirectChat';
import { useVoice } from '../voice/voiceContext';
import { CallContext } from './callContext';

/**
 * Llamada privada 1 a 1 de la sesión (#50): usePrivateCall montado una sola vez, con la misma sala que los
 * canales de voz (VoiceProvider). Sigue activo con la pestaña oculta: una llamada tiene que sonar igual.
 * Suma lo que es de la web: la confirmación si está en un canal de voz, los toasts de error y abrir el chat
 * al atender.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  const { room } = useVoice();
  const privateCall = usePrivateCall({ room });
  const { state } = privateCall;
  const { data: conversations } = useConversationsQuery();
  const queryClient = useQueryClient();

  const conversationId = state.status === 'idle' ? null : state.conversationId;
  const peerId = useMemo(
    () => (conversationId ? (conversations?.find((c) => c.id === conversationId)?.otherUserId ?? null) : null),
    [conversations, conversationId]
  );

  const start = async (id: string) => {
    try {
      const { microphoneAvailable } = await privateCall.start(id);
      if (!microphoneAvailable) showToast('En llamada sin micrófono: revisá los permisos del navegador', 'info');
    } catch (err) {
      showToast(callErrorMessage(err), 'danger');
    }
  };

  const call = (id: string, peerName: string) => {
    if (room.channelId === null) {
      start(id);
      return;
    }
    // Llamar saca del canal de voz: se confirma como el cambio de canal
    const servers = queryClient.getQueryData<Server[]>(['servers']) ?? [];
    const channelName =
      servers.flatMap((srv) => srv.categories.flatMap((cat) => cat.channels)).find((ch) => ch.id === room.channelId)?.name ??
      'otro canal de voz';
    useUIStore.getState().openConfirm('start-call', peerName, channelName, () => start(id));
  };

  const accept = async () => {
    const callerId = peerId;
    try {
      const { microphoneAvailable } = await privateCall.accept();
      if (callerId) openDirectChat(callerId);
      if (!microphoneAvailable) showToast('En llamada sin micrófono: revisá los permisos del navegador', 'info');
    } catch (err) {
      showToast(callErrorMessage(err), 'danger');
    }
  };

  const value = {
    state,
    peerId,
    call,
    accept,
    decline: privateCall.decline,
    hangUp: privateCall.hangUp,
    dismiss: privateCall.dismiss,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}
