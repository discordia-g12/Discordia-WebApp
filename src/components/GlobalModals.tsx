import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CreateServerModal,
  JoinServerModal,
  InviteModal,
  UserProfileModal,
  ConfirmDialog,
  IncomingCallModal
} from './Modals';
import { CreateChannelModal, EditChannelModal, CreateCategoryModal } from './ChannelModals';
import { Server, User, Modal, ConfirmAction, Channel, AppView } from '../types';
import { leaveServer, joinServerViaInvite, deleteServer } from '../api/servers';

interface GlobalModalsProps {
  activeModal: Modal | null;
  setActiveModal: (m: Modal | null) => void;
  confirmAction: ConfirmAction | null;
  setConfirmAction: (a: ConfirmAction | null) => void;
  confirmTargetName: string;
  confirmTargetDetail?: string;
  onConfirmSwitchVoiceChannel?: () => void;
  currentServer: Server | null | undefined;
  currentUser: User;
  usersMap: Record<string, User>;
  selectedProfileUserId: string | null;
  setSelectedProfileUserId: (id: string | null) => void;
  setSelectedServerId: (id: string) => void;
  setSelectedChannelId: (id: string | null) => void;
  setAppView: (view: AppView) => void;
  setInVoiceChannelId: (id: string | null) => void;
  showToast: (msg: string, type?: 'success' | 'danger' | 'info') => void;
  handleCreateServer: (name: string, icon?: string | File) => void;
  createChannelMutation: any;
  editChannelMutation: any;
  deleteChannelMutation: any;
  createCategoryMutation: any;
  channelModalCategoryId: string | null | undefined;
  targetChannelForAction: Channel | null;
  incomingCaller: User | null;
  setIncomingCaller: (u: User | null) => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = (props) => {
  const queryClient = useQueryClient();

  return (
    <>
      {props.activeModal === 'create-server' && (
        <CreateServerModal
          onClose={() => props.setActiveModal(null)}
          onJoinExisting={() => props.setActiveModal('join-server')}
          onCreateServer={(data) => props.handleCreateServer(data.name, data.icon)}
        />
      )}

      {props.activeModal === 'join-server' && (
        <JoinServerModal
          onClose={() => {
            props.setActiveModal(null);
            if (window.location.pathname.startsWith('/invite/')) {
              window.history.replaceState({}, document.title, '/');
            }
          }}
          onJoinServer={(inviteCode) => {
            const rawCode = inviteCode.split('/').pop() || inviteCode;
            joinServerViaInvite(rawCode).then(() => {
              queryClient.invalidateQueries({ queryKey: ['servers'] });
              props.setActiveModal(null);
              props.showToast(`Te has unido con la invitación`, 'success');
              if (window.location.pathname.startsWith('/invite/')) {
                window.history.replaceState({}, document.title, '/');
              }
            }).catch(() => {
              props.showToast(`El código es inválido o expiró`, 'danger');
              if (window.location.pathname.startsWith('/invite/')) {
                window.history.replaceState({}, document.title, '/');
              }
            });
          }}
        />
      )}

      {props.activeModal === 'invite' && props.currentServer && (
        <InviteModal
          server={props.currentServer}
          onClose={() => props.setActiveModal(null)}
        />
      )}

      {props.activeModal === 'user-profile' && props.selectedProfileUserId && props.usersMap[props.selectedProfileUserId] && (
        <UserProfileModal
          user={props.usersMap[props.selectedProfileUserId]}
          currentUser={props.currentUser}
          onClose={() => {
            props.setActiveModal(null);
            props.setSelectedProfileUserId(null);
          }}
          onSendDM={() => {
            props.setActiveModal(null);
            props.setSelectedServerId('home');
            props.setAppView('home');
          }}
          onEditProfile={() => {
            props.setActiveModal(null);
            props.setAppView('own-profile');
          }}
        />
      )}

      {props.activeModal === 'confirm-action' && props.confirmAction && (
        <ConfirmDialog
          action={props.confirmAction}
          targetName={props.confirmTargetName}
          targetDetail={props.confirmTargetDetail}
          onConfirm={async () => {
            if (props.confirmAction === 'delete-server' && props.currentServer) {
              try {
                await deleteServer(props.currentServer.id);
              } catch (e) {
                props.showToast("Error al eliminar servidor", "danger");
                return;
              }
              queryClient.setQueryData<Server[]>(['servers'], (prev = []) => prev.filter((s) => s.id !== props.currentServer!.id));
              props.setSelectedServerId('home');
              props.setAppView('home');
              props.showToast(`Servidor "${props.confirmTargetName}" eliminado`, 'danger');
            } else if (props.confirmAction === 'leave-server' && props.currentServer) {
              leaveServer(props.currentServer.id).then(() => {
                queryClient.setQueryData<Server[]>(['servers'], (prev = []) => prev.filter((s) => s.id !== props.currentServer!.id));
                props.setSelectedServerId('home');
                props.setAppView('home');
                props.showToast(`Has abandonado "${props.confirmTargetName}"`, 'info');
              }).catch(() => {
                props.showToast(`Error al abandonar "${props.confirmTargetName}"`, 'danger');
              });
            } else if (props.confirmAction === 'switch-voice-channel') {
              props.onConfirmSwitchVoiceChannel?.();
            } else {
              props.showToast('Acción confirmada', 'success');
            }
            props.setActiveModal(null);
            props.setConfirmAction(null);
          }}
          onCancel={() => {
            props.setActiveModal(null);
            props.setConfirmAction(null);
          }}
        />
      )}

      {props.incomingCaller && (
        <IncomingCallModal
          caller={props.incomingCaller}
          channelName="Llamada directa"
          onAccept={() => {
            props.setIncomingCaller(null);
            props.setInVoiceChannelId('dm-call');
            props.setAppView('voice');
            props.showToast(`Llamada con ${props.incomingCaller!.displayName || props.incomingCaller!.name} iniciada`, 'success');
          }}
          onDecline={() => {
            props.setIncomingCaller(null);
            props.showToast('Llamada rechazada', 'info');
          }}
        />
      )}

      {props.activeModal === 'create-channel' && props.currentServer && (
        <CreateChannelModal
          categoryId={props.channelModalCategoryId || undefined}
          onClose={() => props.setActiveModal(null)}
          onCreate={async (name: string, type: string, catId?: string) => {
            await props.createChannelMutation.mutateAsync({
              serverId: props.currentServer!.id,
              payload: { name, type, parentId: catId }
            });
          }}
        />
      )}

      {props.activeModal === 'edit-channel' && props.targetChannelForAction && (
        <EditChannelModal
          channel={props.targetChannelForAction}
          categories={props.currentServer?.categories}
          onClose={() => props.setActiveModal(null)}
          onEdit={async (id: string, name: string, categoryId?: string | null) => {
            await props.editChannelMutation.mutateAsync({
              serverId: props.currentServer!.id,
              channelId: id,
              payload: { name, categoryId }
            });
          }}
          onDelete={async (id: string) => {
            await props.deleteChannelMutation.mutateAsync({
              serverId: props.currentServer!.id,
              channelId: id
            });
            if (props.targetChannelForAction && props.targetChannelForAction.id === id) {
              props.setSelectedChannelId(props.currentServer && props.currentServer.channels && props.currentServer.channels.length > 0 ? props.currentServer.channels[0].id : null);
            }
          }}
        />
      )}

      {props.activeModal === 'create-category' && props.currentServer && (
        <CreateCategoryModal
          onClose={() => props.setActiveModal(null)}
          onCreate={async (name: string) => {
            await props.createCategoryMutation.mutateAsync({
              serverId: props.currentServer!.id,
              payload: { name }
            });
          }}
        />
      )}
    </>
  );
};
