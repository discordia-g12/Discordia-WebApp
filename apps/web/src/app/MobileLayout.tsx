import { useCreateCategoryMutation, useCreateChannelMutation, useDeleteChannelMutation, useEditChannelMutation } from '@discordia/core';
import { useUIStore } from './uiStore';
import { useUsers } from './UsersProvider';
import { MobileShell } from './MobileShell';
import { ConnectionBanner } from '../ui/ConnectionBanner';
import { ToastNotification } from '../ui/Toast';
import { CreateServerModal } from '../features/servers/CreateServerModal';
import { JoinServerModal } from '../features/servers/JoinServerModal';
import { useCurrentServer } from '../features/servers/useCurrentServer';
import { useCreateServer } from '../features/servers/serverActions';
import { UserProfileModal } from '../features/profile/UserProfileModal';
import { useCurrentUser } from '../features/profile/currentUserStore';
import { CreateChannelModal, EditChannelModal, CreateCategoryModal } from '../features/channels/ChannelModals';

/** Pantallas menores a 768 px: el shell mobile y sus modales. */
export function MobileLayout() {
  const ui = useUIStore();
  const { servers, currentServer } = useCurrentServer();
  const currentUser = useCurrentUser();
  const { usersMap } = useUsers();
  const handleCreateServer = useCreateServer();
  const createChannelMutation = useCreateChannelMutation();
  const editChannelMutation = useEditChannelMutation();
  const deleteChannelMutation = useDeleteChannelMutation();
  const createCategoryMutation = useCreateCategoryMutation();

  const { activeModal, setActiveModal, selectedProfileUserId, targetChannelForAction } = ui;

  return (
    <>
      <MobileShell
        servers={servers}
        currentUser={currentUser}
        onOpenModal={(m) => setActiveModal(m)}
        onConfirmAction={(act, target) => ui.openConfirm(act, target || '')}
      />

      {/* Modales globales en móvil */}
      {activeModal === 'create-server' && (
        <CreateServerModal
          onClose={() => setActiveModal(null)}
          onCreateServer={(data) => handleCreateServer(data.name, data.icon)}
        />
      )}
      {activeModal === 'join-server' && (
        <JoinServerModal
          onClose={() => setActiveModal(null)}
          onJoinServer={(code) => {
            setActiveModal(null);
            ui.showToast(`Te has unido al servidor (${code})`, 'success');
          }}
        />
      )}
      {activeModal === 'user-profile' && selectedProfileUserId && usersMap[selectedProfileUserId] && (
        <UserProfileModal
          user={usersMap[selectedProfileUserId]}
          currentUser={currentUser}
          onClose={() => setActiveModal(null)}
          onSendDM={() => {
            setActiveModal(null);
            ui.setSelectedServerId('home');
            ui.setAppView('home');
          }}
          onEditProfile={() => {
            setActiveModal(null);
            ui.setAppView('own-profile');
          }}
        />
      )}

      <ConnectionBanner />

      {activeModal === 'create-channel' && currentServer && (
        <CreateChannelModal
          categoryId={ui.channelModalCategoryId}
          onClose={() => setActiveModal(null)}
          onCreate={async (name, type, catId) => {
            await createChannelMutation.mutateAsync({
              serverId: currentServer!.id,
              payload: { name, type, parentId: catId }
            });
          }}
        />
      )}

      {activeModal === 'edit-channel' && targetChannelForAction && (
        <EditChannelModal
          channel={targetChannelForAction}
          categories={currentServer?.categories}
          onClose={() => setActiveModal(null)}
          onEdit={async (id, changes) => {
            await editChannelMutation.mutateAsync({
              serverId: currentServer!.id,
              channelId: id,
              payload: changes
            });
          }}
          onDelete={async (id) => {
            await deleteChannelMutation.mutateAsync({
              serverId: currentServer!.id,
              channelId: id
            });
            if (ui.selectedChannelId === id) {
              ui.setSelectedChannelId(currentServer!.channels?.[0]?.id || null);
            }
          }}
        />
      )}

      {activeModal === 'create-category' && currentServer && (
        <CreateCategoryModal
          onClose={() => setActiveModal(null)}
          onCreate={async (name) => {
            await createCategoryMutation.mutateAsync({
              serverId: currentServer.id,
              payload: { name }
            });
          }}
        />
      )}

      {ui.toast && <ToastNotification message={ui.toast.message} type={ui.toast.type} />}
    </>
  );
}
