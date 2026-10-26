import type { VoiceParticipant } from '../channels/ChannelSidebar';
import { useUsers } from '../../app/usersContext';
import { useCurrentServer } from '../servers/useCurrentServer';
import { useVoice } from './voiceContext';

/**
 * Participantes de voz listos para la interfaz: los de la sala en la que estoy (con quién habla y
 * quién está silenciado), los de cada canal del servidor (presencia) y el canal activo.
 */
export function useVoiceParticipants() {
  const { room, presence } = useVoice();
  const { userOrFallback } = useUsers();
  const { servers } = useCurrentServer();
  const inVoiceChannelId = room.channelId;

  const voiceParticipants: VoiceParticipant[] = room.participants.map((p) => ({
    user: userOrFallback(p.id),
    isSpeaking: p.isSpeaking,
    isMuted: p.isMuted,
    isDeafened: p.isLocal && room.isDeafened,
    videoTrack: p.videoTrack,
  }));

  // Sidebar: presencia de todos los canales; en el canal propio, los datos de LiveKit (quién habla, mute)
  const sidebarVoiceParticipants: Record<string, VoiceParticipant[]> = Object.fromEntries(
    Object.entries(presence).map(([channelId, userIds]) => [
      channelId,
      userIds.map((id) => ({ user: userOrFallback(id) })),
    ])
  );
  if (inVoiceChannelId && voiceParticipants.length > 0) {
    sidebarVoiceParticipants[inVoiceChannelId] = voiceParticipants;
  }

  // Canal de voz activo (puede pertenecer a un servidor distinto al seleccionado, p. ej. estando en Home)
  const activeVoice = inVoiceChannelId
    ? servers
      .flatMap((srv) => srv.categories.flatMap((cat) => cat.channels.map((ch) => ({ srv, ch }))))
      .find(({ ch }) => ch.id === inVoiceChannelId)
    : undefined;

  return { voiceParticipants, sidebarVoiceParticipants, activeVoice };
}
