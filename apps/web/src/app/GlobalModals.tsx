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
import { isNewUi } from '../ui/flag';
import { ConfirmDialog as LegacyConfirmDialog } from '../ui/legacy/ConfirmDialog';
import { CreateServerModal } from '../features/servers/CreateServerModal';
import { JoinServerModal } from '../features/servers/JoinServerModal';
import { InviteModal } from '../features/servers/InviteModal';
import { LegacyCreateServerModal } from '../features/servers/legacy/LegacyCreateServerModal';
import { LegacyJoinServerModal } from '../features/servers/legacy/LegacyJoinServerModal';
import { LegacyInviteModal } from '../features/servers/legacy/LegacyInviteModal';
import { CreateCategoryModal, CreateChannelModal, EditChannelModal } from '../features/channels/ChannelModals';
import {
  LegacyCreateCategoryModal,
  LegacyCreateChannelModal,
  LegacyEditChannelModal,
} from '../features/channels/legacy/LegacyChannelModals';
import { UserProfileModal } from '../features/profile/UserProfileModal';
import { LegacyUserProfileModal } from '../features/profile/legacy/LegacyUserProfileModal';
import { IncomingCallModal } from '../features/voice/IncomingCallModal';
import { LegacyIncomingCallModal } from '../features/voice/legacy/LegacyIncomingCallModal';
import { useCurrentServer } from '../features/servers/useCurrentServer';
import { clearInviteFromUrl, useCreateServer, useJoinServer } from '../features/servers/serverActions';
import { useCurrentUser } from '../features/profile/currentUserStore';
import { useVoice } from '../features/voice/VoiceProvider';
import { useUIStore } from './uiStore';
import { useUsers } from './UsersProvider';

/**
 * Modales de la app de escritorio: cuál está abierto lo decide useUIStore. Lo que hacen es igual en los
 * dos diseños; con el rediseño se montan los del catálogo nuevo (que entran y salen como cortina).
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
    const { action, targetName } = ui.confirm;
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

  if (isNewUi()) {
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

  return (
    <>
      {modal === 'create-server' && (
        <LegacyCreateServerModal
          onClose={close}
          onJoinExisting={() => ui.setActiveModal('join-server')}
          onCreateServer={(data) => createServer(data.name, data.icon)}
        />
      )}
      {modal === 'join-server' && (
        <LegacyJoinServerModal
          onClose={closeJoin}
          onJoinServer={(invite) =>
            joinServer(invite).catch((err: Error) => {
              clearInviteFromUrl();
              ui.showToast(err.message, 'danger');
            })
          }
        />
      )}
      {modal === 'invite' && currentServer && <LegacyInviteModal server={currentServer} onClose={close} />}
      {modal === 'user-profile' && profileUser && (
        <LegacyUserProfileModal
          user={profileUser}
          currentUser={currentUser}
          onClose={closeProfile}
          onSendDM={() => {
            close();
            ui.setSelectedServerId('home');
            ui.setAppView('home');
          }}
          onEditProfile={() => {
            close();
            ui.setAppView('own-profile');
          }}
        />
      )}
      {modal === 'confirm-action' && ui.confirm.action && (
        <LegacyConfirmDialog
          action={ui.confirm.action}
          targetName={ui.confirm.targetName}
          targetDetail={ui.confirm.action === 'switch-voice-channel' ? ui.confirm.targetDetail : undefined}
          onConfirm={confirm}
          onCancel={closeConfirm}
        />
      )}
      {ui.incomingCaller && (
        <LegacyIncomingCallModal caller={ui.incomingCaller} channelName="Llamada directa" onAccept={acceptCall} onDecline={declineCall} />
      )}
      {modal === 'create-channel' && currentServer && (
        <LegacyCreateChannelModal categoryId={ui.channelModalCategoryId || undefined} onClose={close} onCreate={createChannel} />
      )}
      {modal === 'edit-channel' && ui.targetChannelForAction && (
        <LegacyEditChannelModal
          channel={ui.targetChannelForAction}
          categories={currentServer?.categories}
          onClose={close}
          onEdit={editChannel}
          onDelete={deleteChannel}
        />
      )}
      {modal === 'create-category' && currentServer && <LegacyCreateCategoryModal onClose={close} onCreate={createCategory} />}
    </>
  );
}
