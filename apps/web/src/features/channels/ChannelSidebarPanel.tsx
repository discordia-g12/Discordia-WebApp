import {
  errorMessageFor,
  moveCategory,
  moveChannel,
  useReorderCategoriesMutation,
  useReorderChannelsMutation,
} from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';
import { useCurrentServer } from '../servers/useCurrentServer';
import { useCanInCurrentServer } from '../servers/useServerPermission';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile } from '../profile/profileActions';
import { useVoice } from '../voice/voiceContext';
import { useVoiceParticipants } from '../voice/useVoiceParticipants';
import { ChannelSidebar } from './ChannelSidebar';

// Reorden por arrastre (optimista: si el backend lo rechaza, el hook vuelve al orden anterior)
const reorderErrorMessage = (err: unknown) =>
  errorMessageFor(
    err,
    {
      400: 'El orden cambió mientras arrastrabas o hay un canal con el mismo nombre en esa categoría.',
      403: 'No tenés permisos para reordenar canales y categorías en este servidor.',
    },
    'No se pudo guardar el nuevo orden.'
  );

/**
 * Barra lateral del servidor seleccionado: canales, voz y menú del servidor (la barra de usuario la pone
 * el layout). onChannelOpened avisa que se eligió un canal (mobile pasa de la lista al canal).
 */
export function ChannelSidebarPanel({ onChannelOpened }: { onChannelOpened?: () => void }) {
  const { currentServer, isLoadingServers, allServerChannels } = useCurrentServer();
  const currentUser = useCurrentUser();
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const ui = useUIStore.getState;
  const voice = useVoice();
  const { sidebarVoiceParticipants } = useVoiceParticipants();
  const reorderChannelsMutation = useReorderChannelsMutation();
  const reorderCategoriesMutation = useReorderCategoriesMutation();
  const can = useCanInCurrentServer();

  if (!currentServer) return null;
  // Las acciones sin permiso no se ofrecen (ChannelSidebar oculta las que no tienen handler)
  const canManageChannels = can('MANAGE_CHANNELS');
  const canInvite = can('CREATE_INSTANT_INVITE');

  const handleSelectChannel = (channelId: string) => {
    const channel = allServerChannels.find((ch) => ch.id === channelId);
    if (channel?.type === 'voice') {
      // La conexión (y el cambio de vista) la dispara onJoinVoiceChannel; si hay que confirmar
      // el cambio de canal, la vista no se toca hasta que el usuario acepte
      if (!voice.isSwitching(channelId)) {
        ui().setSelectedChannelId(channelId);
        ui().setAppView('voice');
      }
    } else {
      ui().setSelectedChannelId(channelId);
      ui().setAppView('chat');
    }
    onChannelOpened?.();
  };

  const handleMoveChannel = (channelId: string, targetCategoryId: string, beforeChannelId: string | null) => {
    const categories = moveChannel(currentServer.categories, channelId, targetCategoryId, beforeChannelId);
    if (categories === currentServer.categories) return;
    reorderChannelsMutation.mutate(
      { serverId: currentServer.id, categories },
      { onError: (err) => showToast(reorderErrorMessage(err), 'danger') }
    );
  };

  const handleMoveCategory = (categoryId: string, beforeCategoryId: string | null) => {
    const categories = moveCategory(currentServer.categories, categoryId, beforeCategoryId);
    if (categories === currentServer.categories) return;
    reorderCategoriesMutation.mutate(
      { serverId: currentServer.id, categories },
      { onError: (err) => showToast(reorderErrorMessage(err), 'danger') }
    );
  };

  return (
    <ChannelSidebar
      server={currentServer}
      isLoading={isLoadingServers}
      activeChannelId={selectedChannelId}
      onSelectChannel={handleSelectChannel}
      currentUser={currentUser}
      isVoiceConnected={voice.room.channelId !== null}
      activeVoiceChannelId={voice.room.channelId}
      voiceParticipants={sidebarVoiceParticipants}
      locallyMutedUsers={voice.room.locallyMutedUsers}
      onToggleLocalMute={voice.room.toggleLocalMute}
      onViewParticipantProfile={(u) => openUserProfile(u.id)}
      onJoinVoiceChannel={(channelId) => voice.join(channelId)}
      onOpenServerSettings={() => ui().setAppView('server-settings')}
      onInvitePeople={canInvite ? () => ui().setActiveModal('invite') : undefined}
      onCreateChannel={canManageChannels ? (catId) => ui().openCreateChannel(catId) : undefined}
      onCreateCategory={canManageChannels ? () => ui().setActiveModal('create-category') : undefined}
      onMoveChannel={canManageChannels ? handleMoveChannel : undefined}
      onMoveCategory={canManageChannels ? handleMoveCategory : undefined}
      onEditChannel={canManageChannels ? (channel) => ui().openEditChannel(channel) : undefined}
      onOpenServerBoost={() => ui().setAppView('server-settings')}
      onOpenServerProfile={() => ui().setAppView('server-settings')}
      onLeaveServer={() => ui().openConfirm('leave-server', currentServer.name)}
      onDeleteServer={() => ui().openConfirm('delete-server', currentServer.name)}
    />
  );
}
