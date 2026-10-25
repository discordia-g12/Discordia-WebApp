import { AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  deleteServer,
  leaveServer,
  useCreateCategoryMutation,
  useCreateChannelMutation,
  useDeleteChannelMutation,
  useEditChannelMutation,
  type EditChannelRequest,
} from '@discordia/core';
import type { Server } from '../types';
import { ConfirmDialog } from '../ui';
import { CreateServerModal } from '../features/servers/CreateServerModal';
import { JoinServerModal } from '../features/servers/JoinServerModal';
import { InviteModal } from '../features/servers/InviteModal';
import { CreateCategoryModal, CreateChannelModal, EditChannelModal } from '../features/channels/ChannelModals';
import { UserProfileModal } from '../features/profile/UserProfileModal';
import { IncomingCallModal } from '../features/voice/IncomingCallModal';
import { useCurrentServer } from '../features/servers/useCurrentServer';
import { clearInviteFromUrl, useCreateServer, useJoinServer } from '../features/servers/serverActions';
import { useCurrentUser } from '../features/profile/currentUserStore';
import { logoutWithToast } from '../features/profile/profileActions';
import { useVoice } from '../features/voice/voiceContext';
import { useUIStore } from './uiStore';
import { useUsers } from './usersContext';

/**
 * Modales de la app (escritorio y mobile web): cuál está abierto lo decide useUIStore. Entran y salen como
 * cortina (AnimatePresence).
 */
export function GlobalModals() {
  const queryClient = useQueryClient();
  const ui = useUIStore();
  const { currentServer } = useCurrentServer();
  const currentUser = useCurrentUser();
  const { usersMap } = useUsers();
  const voice = useVoice();
  const createServer = useCreateServer();
  const joinServer = useJoinServer();
  const createChannelMutation = useCreateChannelMutation();
  const editChannelMutation = useEditChannelMutation();
  const deleteChannelMutation = useDeleteChannelMutation();
  const createCategoryMutation = useCreateCategoryMutation();

  const close = () => ui.setActiveModal(null);

  const closeJoin = () => {
    close();
    clearInviteFromUrl();
  };

  const closeProfile = () => {
    close();
    ui.setSelectedProfileUserId(null);
  };

  const closeConfirm = () => {
    close();
    ui.setConfirmAction(null);
  };

  /** Saca el servidor de la lista y vuelve al inicio (después de eliminarlo o abandonarlo). */
  const dropCurrentServer = () => {
    queryClient.setQueryData<Server[]>(['servers'], (prev = []) => prev.filter((s) => s.id !== currentServer!.id));
    ui.setSelectedServerId('home');
    ui.setAppView('home');
  };

  const confirm = async () => {
    const { action, targetName, onConfirm } = ui.confirm;
    if (onConfirm) {
      // Quien abrió la confirmación sabe qué hacer (y muestra sus propios avisos)
      closeConfirm();
      await onConfirm();
      return;
    }
    if (action === 'logout') {
      closeConfirm();
      logoutWithToast();
      return;
    }
    if (action === 'delete-server' && currentServer) {
      try {
        await deleteServer(currentServer.id);
      } catch {
        ui.showToast('No se pudo eliminar el servidor', 'danger');
        return;
      }
      dropCurrentServer();
      ui.showToast(`Eliminaste "${targetName}"`, 'info');
    } else if (action === 'leave-server' && currentServer) {
      try {
        await leaveServer(currentServer.id);
      } catch {
        ui.showToast(`No se pudo abandonar "${targetName}"`, 'danger');
        return;
      }
      dropCurrentServer();
      ui.showToast(`Abandonaste "${targetName}"`, 'info');
    } else if (action === 'switch-voice-channel') {
      if (ui.pendingVoiceChannelId) voice.join(ui.pendingVoiceChannelId, { confirmed: true });
      ui.setPendingVoiceChannelId(null);
    }
    closeConfirm();
  };

  const createChannel = async (name: string, type: 'text' | 'voice', parentId?: string) => {
    await createChannelMutation.mutateAsync({ serverId: currentServer!.id, payload: { name, type, parentId } });
  };

  const editChannel = async (channelId: string, payload: EditChannelRequest) => {
    await editChannelMutation.mutateAsync({ serverId: currentServer!.id, channelId, payload });
  };

  const deleteChannel = async (channelId: string) => {
    await deleteChannelMutation.mutateAsync({ serverId: currentServer!.id, channelId });
    if (ui.selectedChannelId === channelId) ui.setSelectedChannelId(currentServer?.channels?.[0]?.id ?? null);
  };

  const createCategory = async (name: string) => {
    await createCategoryMutation.mutateAsync({ serverId: currentServer!.id, payload: { name } });
  };

  const acceptCall = () => {
    const caller = ui.incomingCaller!;
    ui.setIncomingCaller(null);
    voice.join('dm-call');
    ui.setAppView('voice');
    ui.showToast(`Llamada con ${caller.displayName || caller.name} iniciada`, 'success');
  };

  const declineCall = () => {
    ui.setIncomingCaller(null);
    ui.showToast('Llamada rechazada', 'info');
  };

  const profileUser = ui.selectedProfileUserId ? usersMap[ui.selectedProfileUserId] : undefined;
  const modal = ui.activeModal;

  return (
    <AnimatePresence>
      {modal === 'create-server' && (
        <CreateServerModal
          key="create-server"
          currentUser={currentUser}
          onClose={close}
          onJoinExisting={() => ui.setActiveModal('join-server')}
          onCreateServer={({ name }) => createServer(name)}
        />
      )}
      {modal === 'join-server' && (
        <JoinServerModal
          key="join-server"
          onClose={closeJoin}
          onJoinServer={async (invite) => {
            await joinServer(invite);
            close();
          }}
        />
      )}
      {modal === 'invite' && currentServer && <InviteModal key="invite" server={currentServer} onClose={close} />}
      {modal === 'user-profile' && profileUser && (
        <UserProfileModal
          key="user-profile"
          user={profileUser}
          currentUser={currentUser}
          onClose={closeProfile}
          onEditProfile={() => {
            closeProfile();
            ui.setAppView('own-profile');
          }}
        />
      )}
      {modal === 'confirm-action' && ui.confirm.action && (
        <ConfirmDialog
          key="confirm"
          action={ui.confirm.action}
          targetName={ui.confirm.targetName}
          targetDetail={ui.confirm.targetDetail}
          onConfirm={confirm}
          onCancel={closeConfirm}
        />
      )}
      {modal === 'create-channel' && currentServer && (
        <CreateChannelModal key="create-channel" categoryId={ui.channelModalCategoryId} onClose={close} onCreate={createChannel} />
      )}
      {modal === 'edit-channel' && ui.targetChannelForAction && (
        <EditChannelModal
          key="edit-channel"
          channel={ui.targetChannelForAction}
          categories={currentServer?.categories}
          onClose={close}
          onEdit={editChannel}
          onDelete={deleteChannel}
        />
      )}
      {modal === 'create-category' && currentServer && (
        <CreateCategoryModal key="create-category" onClose={close} onCreate={createCategory} />
      )}
      {ui.incomingCaller && (
        <IncomingCallModal key="incoming-call" caller={ui.incomingCaller} onAccept={acceptCall} onDecline={declineCall} />
      )}
    </AnimatePresence>
  );
}
