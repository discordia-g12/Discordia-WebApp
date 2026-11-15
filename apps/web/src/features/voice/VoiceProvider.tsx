import { useMemo, type ReactNode } from 'react';
import { ApiError, useVoicePresence, useVoiceRoom, voiceDisconnectMessage } from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';
import { useCurrentServer } from '../servers/useCurrentServer';
import { VoiceContext } from './voiceContext';

/**
 * Voz de la sesión: una sola sala (LiveKit) que sigue viva al cambiar de vista, y la presencia de
 * los canales del servidor seleccionado.
 */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const { servers, allServerChannels } = useCurrentServer();
  const selectedServerId = useUIStore((s) => s.selectedServerId);

  // Vuelve del canal de voz al primer canal de texto del servidor (o al inicio si el servidor desapareció)
  const exitVoiceView = () => {
    if (useUIStore.getState().appView !== 'voice') return;
    const firstText = allServerChannels.find((c) => c.type === 'text');
    if (firstText) {
      useUIStore.getState().setSelectedChannelId(firstText.id);
      useUIStore.getState().setAppView('chat');
    } else {
      useUIStore.getState().setSelectedChannelId(null);
      useUIStore.getState().setAppView('home');
    }
  };

  const room = useVoiceRoom({
    onUnexpectedDisconnect: (reason) => {
      exitVoiceView();
      showToast(voiceDisconnectMessage(reason), reason === 'duplicate' ? 'info' : 'danger');
    },
  });

  const serverVoiceChannelIds = useMemo(
    () => allServerChannels.filter((ch) => ch.type === 'voice').map((ch) => ch.id),
    [allServerChannels]
  );
  const presence = useVoicePresence(selectedServerId === 'home' ? [] : serverVoiceChannelIds);

  const isSwitching = (channelId: string) => room.channelId !== null && room.channelId !== channelId;

  const findChannelName = (channelId: string | null) =>
    servers
      .flatMap((srv) => srv.categories.flatMap((cat) => cat.channels))
      .find((ch) => ch.id === channelId)?.name ?? 'otro canal de voz';

  const join = async (channelId: string, { confirmed = false } = {}) => {
    const ui = useUIStore.getState();
    if (!confirmed && isSwitching(channelId)) {
      ui.setPendingVoiceChannelId(channelId);
      ui.openConfirm('switch-voice-channel', findChannelName(channelId), findChannelName(room.channelId));
      return;
    }
    ui.setSelectedChannelId(channelId);
    ui.setAppView('voice');
    if (room.channelId === channelId) return;
    try {
      const { microphoneAvailable } = await room.join(channelId);
      if (microphoneAvailable) {
        showToast('Conectado al canal de voz', 'success');
      } else {
        showToast('Conectado sin micrófono: revisá los permisos del navegador', 'info');
      }
    } catch (err) {
      console.error('[Voice] Error al unirse al canal:', err);
      // Salir de la vista de voz solo si el usuario sigue mirando este canal
      const nav = useUIStore.getState();
      if (nav.appView === 'voice' && nav.selectedChannelId === channelId) exitVoiceView();
      // Sin permiso, reintentar no sirve; un error de red o del servidor, sí
      if (err instanceof ApiError && err.status === 403) {
        showToast('No tenés permiso para entrar a este canal de voz', 'danger');
      } else {
        showToast('No se pudo conectar al canal de voz', 'danger', { label: 'reintentar', onPress: () => join(channelId) });
      }
    }
  };

  const toggleCamera = async () => {
    const turningOn = !room.isCameraOn;
    const ok = await room.toggleCamera();
    if (!ok && turningOn) {
      showToast('No se pudo prender la cámara: revisá los permisos del navegador', 'info');
    }
  };

  const disconnect = () => {
    room.leave();
    exitVoiceView();
    showToast('Desconectado de la llamada', 'info');
  };

  return (
    <VoiceContext.Provider value={{ room, presence, join, disconnect, isSwitching, toggleCamera }}>{children}</VoiceContext.Provider>
  );
}
