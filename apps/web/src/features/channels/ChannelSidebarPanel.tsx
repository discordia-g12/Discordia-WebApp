import {
  errorMessageFor,
  moveCategory,
  moveChannel,
  useReorderCategoriesMutation,
  useReorderChannelsMutation,
} from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';
import { useCurrentServer } from '../servers/useCurrentServer';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile, useUserPanelActions } from '../profile/profileActions';
import { useVoice } from '../voice/VoiceProvider';
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
 * Barra lateral del servidor seleccionado: canales, voz, menú del servidor y barra de usuario (sin ella
 * con showUserPanel={false}: en el rediseño la pone el layout).
 */
export function ChannelSidebarPanel({ showUserPanel = true }: { showUserPanel?: boolean }) {
  const { currentServer, isLoadingServers, allServerChannels } = useCurrentServer();
  const currentUser = useCurrentUser();
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const ui = useUIStore.getState;
  const voice = useVoice();
  const { sidebarVoiceParticipants } = useVoiceParticipants();
  const userPanel = useUserPanelActions();
  const reorderChannelsMutation = useReorderChannelsMutation();
  const reorderCategoriesMutation = useReorderCategoriesMutation();

  if (!currentServer) return null;

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
      showUserPanel={showUserPanel}
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
      isMuted={voice.room.isMuted}
      isDeafened={voice.room.isDeafened}
      onToggleMute={voice.room.toggleMute}
      onToggleDeafen={voice.room.toggleDeafen}
      onOpenSettings={userPanel.onOpenSettings}
      onDisconnectVoice={voice.disconnect}
      onJoinVoiceChannel={(channelId) => voice.join(channelId)}
      onOpenServerSettings={() => ui().setAppView('server-settings')}
      onInvitePeople={() => ui().setActiveModal('invite')}
      onCreateChannel={(catId) => ui().openCreateChannel(catId)}
      onCreateCategory={() => ui().setActiveModal('create-category')}
      onMoveChannel={handleMoveChannel}
      onMoveCategory={handleMoveCategory}
      onEditChannel={(channel) => ui().openEditChannel(channel)}
      onOpenServerBoost={() => ui().setAppView('server-settings')}
      onOpenServerProfile={() => ui().setAppView('server-settings')}
      onLeaveServer={() => ui().openConfirm('leave-server', currentServer.name)}
      onDeleteServer={() => ui().openConfirm('delete-server', currentServer.name)}
      onChangeStatus={userPanel.onChangeStatus}
      onSaveCustomStatus={userPanel.onSaveCustomStatus}
      onEditProfile={userPanel.onEditProfile}
      onBuyPoints={userPanel.onBuyPoints}
      onSubscribePremium={userPanel.onSubscribePremium}
      onLogout={userPanel.onLogout}
    />
  );
}
