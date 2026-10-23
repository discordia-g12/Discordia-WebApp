import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CreateServerModal } from '../features/servers/CreateServerModal';
import { JoinServerModal } from '../features/servers/JoinServerModal';
import { InviteModal } from '../features/servers/InviteModal';
import { UserProfileModal } from '../features/profile/UserProfileModal';
import { IncomingCallModal } from '../features/voice/IncomingCallModal';
import { ConfirmDialog } from '../ui/legacy/ConfirmDialog';
import { CreateChannelModal, EditChannelModal, CreateCategoryModal } from '../features/channels/ChannelModals';
import type { Server } from '../types';
import {
  leaveServer,
  joinServerViaInvite,
  deleteServer,
  EditChannelRequest,
  useCreateCategoryMutation,
  useCreateChannelMutation,
  useDeleteChannelMutation,
  useEditChannelMutation,
} from '@discordia/core';
import { useUIStore } from './uiStore';
import { useUsers } from './UsersProvider';
import { useCurrentServer } from '../features/servers/useCurrentServer';
import { useCreateServer } from '../features/servers/serverActions';
import { useCurrentUser } from '../features/profile/currentUserStore';
import { useVoice } from '../features/voice/VoiceProvider';

/** Modales de la app de escritorio: cuál está abierto lo decide useUIStore. */
export const GlobalModals: React.FC = () => {
  const queryClient = useQueryClient();
  const ui = useUIStore();
  const { currentServer } = useCurrentServer();
  const currentUser = useCurrentUser();
  const { usersMap } = useUsers();
  const voice = useVoice();
  const handleCreateServer = useCreateServer();
  const createChannelMutation = useCreateChannelMutation();
  const editChannelMutation = useEditChannelMutation();
  const deleteChannelMutation = useDeleteChannelMutation();
  const createCategoryMutation = useCreateCategoryMutation();

  // Lo que necesitan los modales, del store y de los hooks
  const deps = {
    activeModal: ui.activeModal,
    setActiveModal: ui.setActiveModal,
    confirmAction: ui.confirm.action,
    setConfirmAction: ui.setConfirmAction,
    confirmTargetName: ui.confirm.targetName,
    confirmTargetDetail: ui.confirm.action === 'switch-voice-channel' ? ui.confirm.targetDetail : undefined,
    onConfirmSwitchVoiceChannel: () => {
      if (ui.pendingVoiceChannelId) voice.join(ui.pendingVoiceChannelId, { confirmed: true });
      ui.setPendingVoiceChannelId(null);
    },
    currentServer,
    currentUser,
    usersMap,
    selectedProfileUserId: ui.selectedProfileUserId,
    setSelectedProfileUserId: ui.setSelectedProfileUserId,
    setSelectedServerId: ui.setSelectedServerId,
    setSelectedChannelId: ui.setSelectedChannelId,
    setAppView: ui.setAppView,
    setInVoiceChannelId: (id: string | null) => (id ? voice.join(id) : voice.disconnect()),
    showToast: ui.showToast,
    handleCreateServer,
    createChannelMutation,
    editChannelMutation,
    deleteChannelMutation,
    createCategoryMutation,
    channelModalCategoryId: ui.channelModalCategoryId,
    targetChannelForAction: ui.targetChannelForAction,
    incomingCaller: ui.incomingCaller,
    setIncomingCaller: ui.setIncomingCaller,
  };

  return (
    <>
      {deps.activeModal === 'create-server' && (
        <CreateServerModal
          onClose={() => deps.setActiveModal(null)}
          onJoinExisting={() => deps.setActiveModal('join-server')}
          onCreateServer={(data) => deps.handleCreateServer(data.name, data.icon)}
        />
      )}

      {deps.activeModal === 'join-server' && (
        <JoinServerModal
          onClose={() => {
            deps.setActiveModal(null);
            if (window.location.pathname.startsWith('/invite/')) {
              window.history.replaceState({}, document.title, '/');
            }
          }}
          onJoinServer={(inviteCode) => {
            const rawCode = inviteCode.split('/').pop() || inviteCode;
            joinServerViaInvite(rawCode).then(() => {
              queryClient.invalidateQueries({ queryKey: ['servers'] });
              deps.setActiveModal(null);
              deps.showToast(`Te has unido con la invitación`, 'success');
              if (window.location.pathname.startsWith('/invite/')) {
                window.history.replaceState({}, document.title, '/');
              }
            }).catch(() => {
              deps.showToast(`El código es inválido o expiró`, 'danger');
              if (window.location.pathname.startsWith('/invite/')) {
                window.history.replaceState({}, document.title, '/');
              }
            });
          }}
        />
      )}

      {deps.activeModal === 'invite' && deps.currentServer && (
        <InviteModal
          server={deps.currentServer}
          onClose={() => deps.setActiveModal(null)}
        />
      )}

      {deps.activeModal === 'user-profile' && deps.selectedProfileUserId && deps.usersMap[deps.selectedProfileUserId] && (
        <UserProfileModal
          user={deps.usersMap[deps.selectedProfileUserId]}
          currentUser={deps.currentUser}
          onClose={() => {
            deps.setActiveModal(null);
            deps.setSelectedProfileUserId(null);
          }}
          onSendDM={() => {
            deps.setActiveModal(null);
            deps.setSelectedServerId('home');
            deps.setAppView('home');
          }}
          onEditProfile={() => {
            deps.setActiveModal(null);
            deps.setAppView('own-profile');
          }}
        />
      )}

      {deps.activeModal === 'confirm-action' && deps.confirmAction && (
        <ConfirmDialog
          action={deps.confirmAction}
          targetName={deps.confirmTargetName}
          targetDetail={deps.confirmTargetDetail}
          onConfirm={async () => {
            if (deps.confirmAction === 'delete-server' && deps.currentServer) {
              try {
                await deleteServer(deps.currentServer.id);
              } catch (e) {
                deps.showToast("Error al eliminar servidor", "danger");
                return;
              }
              queryClient.setQueryData<Server[]>(['servers'], (prev = []) => prev.filter((s) => s.id !== deps.currentServer!.id));
              deps.setSelectedServerId('home');
              deps.setAppView('home');
              deps.showToast(`Servidor "${deps.confirmTargetName}" eliminado`, 'danger');
            } else if (deps.confirmAction === 'leave-server' && deps.currentServer) {
              leaveServer(deps.currentServer.id).then(() => {
                queryClient.setQueryData<Server[]>(['servers'], (prev = []) => prev.filter((s) => s.id !== deps.currentServer!.id));
                deps.setSelectedServerId('home');
                deps.setAppView('home');
                deps.showToast(`Has abandonado "${deps.confirmTargetName}"`, 'info');
              }).catch(() => {
                deps.showToast(`Error al abandonar "${deps.confirmTargetName}"`, 'danger');
              });
            } else if (deps.confirmAction === 'switch-voice-channel') {
              deps.onConfirmSwitchVoiceChannel?.();
            } else {
              deps.showToast('Acción confirmada', 'success');
            }
            deps.setActiveModal(null);
            deps.setConfirmAction(null);
          }}
          onCancel={() => {
            deps.setActiveModal(null);
            deps.setConfirmAction(null);
          }}
        />
      )}

      {deps.incomingCaller && (
        <IncomingCallModal
          caller={deps.incomingCaller}
          channelName="Llamada directa"
          onAccept={() => {
            deps.setIncomingCaller(null);
            deps.setInVoiceChannelId('dm-call');
            deps.setAppView('voice');
            deps.showToast(`Llamada con ${deps.incomingCaller!.displayName || deps.incomingCaller!.name} iniciada`, 'success');
          }}
          onDecline={() => {
            deps.setIncomingCaller(null);
            deps.showToast('Llamada rechazada', 'info');
          }}
        />
      )}

      {deps.activeModal === 'create-channel' && deps.currentServer && (
        <CreateChannelModal
          categoryId={deps.channelModalCategoryId || undefined}
          onClose={() => deps.setActiveModal(null)}
          onCreate={async (name, type, catId) => {
            await deps.createChannelMutation.mutateAsync({
              serverId: deps.currentServer!.id,
              payload: { name, type, parentId: catId }
            });
          }}
        />
      )}

      {deps.activeModal === 'edit-channel' && deps.targetChannelForAction && (
        <EditChannelModal
          channel={deps.targetChannelForAction}
          categories={deps.currentServer?.categories}
          onClose={() => deps.setActiveModal(null)}
          onEdit={async (id: string, changes: EditChannelRequest) => {
            await deps.editChannelMutation.mutateAsync({
              serverId: deps.currentServer!.id,
              channelId: id,
              payload: changes
            });
          }}
          onDelete={async (id: string) => {
            await deps.deleteChannelMutation.mutateAsync({
              serverId: deps.currentServer!.id,
              channelId: id
            });
            if (deps.targetChannelForAction && deps.targetChannelForAction.id === id) {
              deps.setSelectedChannelId(deps.currentServer && deps.currentServer.channels && deps.currentServer.channels.length > 0 ? deps.currentServer.channels[0].id : null);
            }
          }}
        />
      )}

      {deps.activeModal === 'create-category' && deps.currentServer && (
        <CreateCategoryModal
          onClose={() => deps.setActiveModal(null)}
          onCreate={async (name: string) => {
            await deps.createCategoryMutation.mutateAsync({
              serverId: deps.currentServer!.id,
              payload: { name }
            });
          }}
        />
      )}
    </>
  );
};
