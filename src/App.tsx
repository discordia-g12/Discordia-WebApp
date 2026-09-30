import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Server,
  User,
  Status,
  AppView,
  Modal,
  ConfirmAction,
  Message,
  MessageAttachment,
  DirectMessage,
} from './types';

import { CreateChannelModal, EditChannelModal } from './components/ChannelModals';
import { GlobalModals } from './components/GlobalModals';
import {
  ServerRail,
  ChannelSidebar,
  UserPanel,
  ChatView,
  VoiceView,
  MemberList,
  HomeView,
  MobileShell,
  CreateServerModal,
  JoinServerModal,
  UserProfileModal,
} from './components';

import {
  AuthView,
  OwnProfileView,
  ServerSettings,
  UserSettings,
} from './views';

import { useSession, bootstrap, authService } from './auth/session';
import { useServersQuery, useCreateServerMutation, useChannelMessagesQuery, useServerMembersQuery, useCreateChannelMutation, useEditChannelMutation, useDeleteChannelMutation } from './api/hooks/useApi';
import { useChatWebSocket } from './api/hooks/useChatWebSocket';
import { updateMyProfile, getUsersBulk } from './api/users';

/**
 * Hook para detectar si el viewport corresponde a un dispositivo móvil (<768px).
 */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return mobile;
}

/**
 * Banner flotante de conectividad (offline / restablecido).
 */
function ConnectionBanner() {
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => {
      setOffline(false);
      setReconnected(true);
      const timer = setTimeout(() => setReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!offline && !reconnected) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: offline ? 'var(--status-danger, #ed4245)' : 'var(--status-online, #23a55a)',
        color: '#ffffff',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 600,
        zIndex: 9999,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
      }}
    >
      {offline ? '⚠️ Conexión perdida — Intentando reconectar...' : '✓ Conexión restablecida'}
    </div>
  );
}

/**
 * Componente Toast para avisos flotantes efímeros.
 */
function ToastNotification({
  message,
  type = 'info',
}: {
  message: string;
  type?: 'success' | 'danger' | 'info';
}) {
  const bg =
    type === 'success' ? '#23a55a' : type === 'danger' ? '#ed4245' : 'var(--brand-blurple, #5865f2)';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        backgroundColor: bg,
        color: '#ffffff',
        padding: '10px 18px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {message}
    </div>
  );
}


function str_hash(str: string) {
  return str.substring(str.length - 4);
}

export default function App() {
  const isMobile = useIsMobile();
  const { status, profile } = useSession();

  // Inicialización de sesión con protección contra StrictMode
  useEffect(() => {
    bootstrap();
  }, []);

  // Sincronizar usuario activo cuando se carga el perfil del backend
  useEffect(() => {
    if (profile) {
      setCurrentUser((prev) => ({
        ...prev,
        ...profile,
        displayName: profile.displayName || profile.display_name || profile.username,
        avatar: profile.avatar || profile.avatar_url || prev.avatar,
      }));
    }
  }, [profile]);

  // Estados principales de navegación y servidor
  const [directMessagesList, setDirectMessagesList] = useState<DirectMessage[]>([]);
  const [globalUsers, setGlobalUsers] = useState<Record<string, User>>({});
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const p = useSession.getState().profile;
    return {
      id: p?.id || 'temp_id',
      username: p?.username || 'user',
      displayName: p?.displayName || p?.display_name || p?.username || 'User',
      avatar: p?.avatar || p?.avatar_url || '',
      status: 'online',
      customStatus: '',
      email: p?.email || '',
    };
  });
  
  const queryClient = useQueryClient();

  const { data: activeServers, isLoading: isLoadingServers } = useServersQuery();
  const [selectedServerId, setSelectedServerId] = useState<string | 'home'>('home');
  const { data: serverMembersData } = useServerMembersQuery(selectedServerId === 'home' ? null : selectedServerId);

  const serverMembersAsUsers = useMemo(() => {
    if (!serverMembersData) return [];
    return serverMembersData.pages.flatMap(p => p.items).map(m => ({
      id: m.userId,
      username: m.userId,
      displayName: m.nickname || `User ${str_hash(m.userId)}`,
      roleIds: m.roleIds,
      status: 'online' as Status,
      avatar: undefined
    }));
  }, [serverMembersData]);

  const createServerMutation = useCreateServerMutation();
  const createChannelMutation = useCreateChannelMutation();
  const editChannelMutation = useEditChannelMutation();
  const deleteChannelMutation = useDeleteChannelMutation();
  const servers = activeServers || [];
  
  


  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  
  const { data: realMessages, isLoading: isLoadingMessages } = useChannelMessagesQuery(
    selectedServerId !== 'home' ? selectedChannelId : null
  );


  // Sincronizar globalUsers con los perfiles reales
  useEffect(() => {
    const requiredUserIds = new Set<string>();
    
    // Obtener de miembros
    serverMembersAsUsers.forEach(u => requiredUserIds.add(u.id));
    
    // Obtener de mensajes directos
    directMessagesList.forEach(dm => {
      const targetId = dm.recipientId || dm.userId;
      if (targetId) requiredUserIds.add(targetId);
    });

    // Obtener de mensajes en el chat
    if (realMessages) {
      realMessages.forEach(msg => {
        if (msg.authorId) requiredUserIds.add(msg.authorId);
      });
    }

    const missingIds = Array.from(requiredUserIds).filter(id => !globalUsers[id] && id !== currentUser.id);

    if (missingIds.length > 0) {
      getUsersBulk(missingIds).then(profiles => {
        setGlobalUsers(prev => {
          const next = { ...prev };
          profiles.forEach(p => {
            next[p.id] = p;
          });
          return next;
        });
      }).catch(err => {
        console.error("Error fetching bulk users:", err);
      });
    }
  }, [serverMembersAsUsers, directMessagesList, realMessages, currentUser.id, globalUsers]);

  const usersMap = useMemo(() => {
    const map: Record<string, User> = { ...globalUsers };
    
    // Fallback: Si no esta en globalUsers todavia, usar la info incompleta de miembros
    serverMembersAsUsers.forEach(u => {
      if (!map[u.id]) {
        map[u.id] = u;
      }
    });
    
    map[currentUser.id] = currentUser;
    return map;
  }, [globalUsers, serverMembersAsUsers, currentUser]);

  const { sendMessageWs } = useChatWebSocket(
    selectedServerId !== 'home' && selectedChannelId ? selectedChannelId : null,
    currentUser.id
  );
  const [appView, setAppView] = useState<AppView>('chat');
  const [isMemberListOpen, setIsMemberListOpen] = useState<boolean>(true);

  // Estados de voz y multimedia
  const [inVoiceChannelId, setInVoiceChannelId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);

  // Estados de mensajes y canales
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => ({
    ...{},
  }));
  
  const [selectedDmId, setSelectedDmId] = useState<string | null>(null);

  // Notificaciones y búsqueda
      
  // Modales
  const [activeModal, setActiveModal] = useState<Modal>(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmTargetName, setConfirmTargetName] = useState<string>('');
  const [channelModalCategoryId, setChannelModalCategoryId] = useState<string | undefined>();
  const [targetChannelForAction, setTargetChannelForAction] = useState<any>(null);

  // Toast flotante
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'danger' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'danger' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Parseo de link de invitación desde URL
  useEffect(() => {
    if (status !== 'authenticated') return;
    
    const path = window.location.pathname;
    if (path.startsWith('/invite/')) {
      setActiveModal('join-server');
    }
  }, [status]);


  // Llamada entrante simulada para testing
  const [incomingCaller, setIncomingCaller] = useState<User | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      // Simular llamada de Sofia después de 12 segundos
      if (usersMap['u1']) {
        setIncomingCaller(usersMap['u1']);
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  // Servidor y canal actualmente seleccionados
  const currentServer = useMemo(() => {
    if (selectedServerId === 'home') return null;
    return servers.find((s) => s.id === selectedServerId) || null;
  }, [servers, selectedServerId]);

  const allServerChannels = useMemo(() => {
    if (!currentServer) return [];
    return currentServer.categories.flatMap((cat) => cat.channels);
  }, [currentServer]);

  const currentChannel = useMemo(() => {
    if (!selectedChannelId) return null;
    return allServerChannels.find((ch) => ch.id === selectedChannelId) || null;
  }, [allServerChannels, selectedChannelId]);

  // Mensajes del canal o DM activo
  const activeMessages = useMemo(() => {
    if (selectedServerId !== 'home') {
      return realMessages || [];
    }
    const key = selectedDmId;
    if (!key) return [];
    return messagesMap[key] || [];
  }, [selectedServerId, selectedDmId, realMessages, messagesMap]);

  // Manejador de selección de servidor
  const handleSelectServer = (serverId: string | 'home') => {
    setSelectedServerId(serverId);
    if (serverId === 'home') {
      setAppView('home');
      setSelectedDmId(null);
    } else {
      const srv = servers.find((s) => s.id === serverId);
      if (srv) {
        const firstTextChannel = srv.categories
          .flatMap((c) => c.channels)
          .find((ch) => ch.type === 'text');
        setSelectedChannelId(firstTextChannel?.id || null);
        setAppView('chat');
      }
    }
  };

  // Manejador de selección de canal
  const handleSelectChannel = (channelId: string) => {
    const channel = allServerChannels.find((ch) => ch.id === channelId);
    setSelectedChannelId(channelId);
    if (channel?.type === 'voice') {
      setAppView('voice');
      setInVoiceChannelId(channelId);
    } else {
      setAppView('chat');
    }
  };

  // Manejador para unirse a canal de voz
  const handleJoinVoiceChannel = (channelId: string) => {
    setInVoiceChannelId(channelId);
    setSelectedChannelId(channelId);
    setAppView('voice');
    showToast('Conectado al canal de voz', 'success');
  };

  // Manejador de desconexión de voz
  const handleDisconnectVoice = () => {
    setInVoiceChannelId(null);
    if (appView === 'voice') {
      const firstText = allServerChannels.find((c) => c.type === 'text');
      if (firstText) {
        setSelectedChannelId(firstText.id);
        setAppView('chat');
      }
    }
    showToast('Desconectado de la llamada', 'info');
  };

  // Enviar mensaje en canal o DM
  const handleSendMessage = async (
    content: string,
    attachment?: MessageAttachment,
    replyToId?: string,
  ) => {
    if (selectedServerId !== 'home') {
      if (!selectedChannelId) return;
      try {
        await sendMessageWs(content);
      } catch (err) {
        showToast('Error al enviar el mensaje por WebSocket', 'danger');
      }
      return;
    }

    const key = selectedDmId;
    if (!key) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      channelId: key,
      authorId: currentUser.id,
      userId: currentUser.id,
      content,
      timestamp: new Date().toISOString(),
      type: 'normal',
      replyToId: replyToId || null,
      fileAttachment: attachment
        ? {
            name: attachment.name,
            size: typeof attachment.size === 'number' ? `${(attachment.size / 1024).toFixed(1)} KB` : (attachment.size || '0 KB'),
            type: attachment.type,
          }
        : undefined,
    };

    setMessagesMap((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newMsg],
    }));

    if (selectedDmId) {
      setDirectMessagesList((prev) =>
        prev.map((dm) =>
          dm.id === selectedDmId
            ? { ...dm, lastMessage: content, lastTimestamp: 'Just now' }
            : dm,
        ),
      );
    }
  };

  // Alternar reacción emoji
  const handleToggleReaction = (messageId: string, emoji: string) => {
    const key = selectedServerId === 'home' ? selectedDmId : selectedChannelId;
    if (!key) return;

    const updater = (list: Message[]) => {
      return list.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = msg.reactions || [];
        const existing = reactions.find((r) => r.emoji === emoji);
        let nextReactions: import('./types').Reaction[];
        if (existing) {
          if (existing.reacted) {
            nextReactions = reactions
              .map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: r.count - 1,
                      reacted: false,
                      users: (r.users || []).filter((u) => u !== currentUser.id),
                    }
                  : r,
              )
              .filter((r) => r.count > 0);
          } else {
            nextReactions = reactions.map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count + 1,
                    reacted: true,
                    users: [...(r.users || []), currentUser.id],
                  }
                : r,
            );
          }
        } else {
          nextReactions = [
            ...reactions,
            { emoji, count: 1, reacted: true, users: [currentUser.id] },
          ];
        }
        return { ...msg, reactions: nextReactions };
      });
    };

    if (selectedServerId !== 'home') {
      queryClient.setQueryData(['messages', key, undefined], (old: Message[] | undefined) => {
        if (!old) return old;
        return updater(old);
      });
      return;
    }

    setMessagesMap((prev) => ({ ...prev, [key]: updater(prev[key] || []) }));
  };

  // Eliminar mensaje
  const handleDeleteMessage = (messageId: string) => {
    const key = selectedServerId === 'home' ? selectedDmId : selectedChannelId;
    if (!key) return;

    if (selectedServerId !== 'home') {
      queryClient.setQueryData(['messages', key, undefined], (old: Message[] | undefined) => {
        if (!old) return old;
        return old.map((m) => (m.id === messageId ? { ...m, type: 'deleted' as const, content: '' } : m));
      });
      showToast('Backend deletion not implemented yet', 'info');
      return;
    }

    setMessagesMap((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((m) =>
        m.id === messageId ? { ...m, type: 'deleted' as const, content: '' } : m,
      ),
    }));
    showToast('Mensaje eliminado', 'info');
  };

  // Editar mensaje
  const handleEditMessage = (messageId: string, newContent: string) => {
    const key = selectedServerId === 'home' ? selectedDmId : selectedChannelId;
    if (!key) return;

    if (selectedServerId !== 'home') {
      queryClient.setQueryData(['messages', key, undefined], (old: Message[] | undefined) => {
        if (!old) return old;
        return old.map((m) => (m.id === messageId ? { ...m, content: newContent, edited: true } : m));
      });
      showToast('Backend editing not implemented yet', 'info');
      return;
    }

    setMessagesMap((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((m) =>
        m.id === messageId ? { ...m, content: newContent, edited: true } : m,
      ),
    }));
    showToast('Mensaje editado', 'success');
  };

  // Creación de nuevo servidor
  const handleCreateServer = async (name: string, icon?: string | File) => {
    try {
      const newServer = await createServerMutation.mutateAsync({ 
        name,
        icon: icon instanceof File ? icon : undefined 
      });
      setSelectedServerId(newServer.id);
      setActiveModal(null);
      showToast('Servidor creado', 'success');
    } catch (error) {
      showToast('Error al crear el servidor', 'danger');
    }
  };

  // Actualizar usuario propio
  const handleUpdateCurrentUser = (updatedUser: User) => {
    updateMyProfile({
      display_name: updatedUser.displayName,
      avatar_url: updatedUser.avatarUrl || updatedUser.avatar,
      bio: updatedUser.bio,
      custom_status: updatedUser.customStatus,
    }).then(() => {
      setCurrentUser(updatedUser);
      showToast('Perfil actualizado con éxito', 'success');
    }).catch(() => {
      showToast('Error al actualizar el perfil', 'danger');
    });
  };

  // Actualizar servidor
  const handleUpdateServer = (updatedServer: Server) => {
    queryClient.setQueryData<Server[]>(['servers'], (prev = []) => 
      prev.map((s) => (s.id === updatedServer.id ? updatedServer : s))
    );
    showToast('Configuración del servidor guardada', 'success');
  };

  // Abrir perfil de usuario
  const handleOpenUserProfile = (userId: string) => {
    if (userId === currentUser.id) {
      setAppView('own-profile');
    } else {
      setSelectedProfileUserId(userId);
      setActiveModal('user-profile');
    }
  };

  // Cerrar sesión
  const handleLogout = () => {
    authService.logout();
    showToast('Sesión cerrada', 'info');
  };

  // Si no está autenticado (bootstrapping, unauthenticated, needs_profile, suspended, error), renderizar AuthView
  if (status !== 'authenticated') {
    return <AuthView />;
  }

  // Shell móvil para pantallas menores a 768px
  if (isMobile) {
    return (
      <>
        <MobileShell
          servers={servers}
          currentUser={currentUser}
          onOpenModal={(m) => setActiveModal(m)}
          onConfirmAction={(act, target) => {
            setConfirmAction(act);
            setConfirmTargetName(target || '');
            setActiveModal('confirm-action');
          }}
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
              showToast(`Te has unido al servidor (${code})`, 'success');
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
              setSelectedServerId('home');
              setAppView('home');
            }}
            onEditProfile={() => {
              setActiveModal(null);
              setAppView('own-profile');
            }}
          />
        )}

        <ConnectionBanner />
        
      {activeModal === 'create-channel' && currentServer && (
        <CreateChannelModal
          categoryId={channelModalCategoryId}
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
          onClose={() => setActiveModal(null)}
          onEdit={async (id, name) => {
            await editChannelMutation.mutateAsync({
              serverId: currentServer!.id,
              channelId: id,
              payload: { name }
            });
          }}
          onDelete={async (id) => {
            await deleteChannelMutation.mutateAsync({
              serverId: currentServer!.id,
              channelId: id
            });
            if (selectedChannelId === id) {
              setSelectedChannelId(currentServer!.channels?.[0]?.id || null);
            }
          }}
        />
      )}

      {toast && <ToastNotification message={toast.message} type={toast.type} />}
      </>
    );
  }

  // Vistas a pantalla completa (Desktop)
  if (appView === 'own-profile') {
    return (
      <OwnProfileView
        currentUser={currentUser}
        onBack={() => setAppView('chat')}
        onSave={(updated) => {
          handleUpdateCurrentUser(updated);
          setAppView('chat');
        }}
      />
    );
  }

  if (appView === 'server-settings' && currentServer) {
    return (
      <ServerSettings
        server={currentServer}
        currentUser={currentUser}
        onClose={() => setAppView('chat')}
        onUpdateServer={handleUpdateServer}
      />
    );
  }

  if (appView === 'user-settings') {
    return (
      <UserSettings
        currentUser={currentUser}
        onClose={() => setAppView('chat')}
        onUpdateUser={handleUpdateCurrentUser}
        onLogout={handleLogout}
      />
    );
  }

  // Canal de voz activo (puede pertenecer a un servidor distinto al seleccionado, p. ej. estando en Home)
  const activeVoice = inVoiceChannelId
    ? servers
        .flatMap((srv) => srv.categories.flatMap((cat) => cat.channels.map((ch) => ({ srv, ch }))))
        .find(({ ch }) => ch.id === inVoiceChannelId)
    : undefined;

  // Layout principal Desktop de tres niveles
  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-tertiary, #202225)',
      }}
    >
      {/* Nivel 1: Carril de Servidores */}
      <ServerRail
        servers={servers}
        selectedServerId={selectedServerId}
        onSelectServer={handleSelectServer}
        onAddServer={() => setActiveModal('create-server')}
        onDiscoverServers={() => setActiveModal('join-server')}
        homeBadgeCount={0}
        isLoading={isLoadingServers}
      />

      {/* Nivel 2: Sidebar del Servidor activo */}
      {selectedServerId !== 'home' && currentServer && (
        <ChannelSidebar
          server={currentServer}
          isLoading={isLoadingServers}
          activeChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          currentUser={currentUser}
          isVoiceConnected={inVoiceChannelId !== null}
          activeVoiceChannelId={inVoiceChannelId}
          isMuted={isMuted}
          isDeafened={isDeafened}
          onToggleMute={() => setIsMuted((m) => !m)}
          onToggleDeafen={() => setIsDeafened((d) => !d)}
          onOpenSettings={() => setAppView('user-settings')}
          onDisconnectVoice={handleDisconnectVoice}
          onJoinVoiceChannel={handleJoinVoiceChannel}
          onOpenServerSettings={() => setAppView('server-settings')}
          onInvitePeople={() => setActiveModal('invite')}
          onCreateChannel={(catId) => {
            setChannelModalCategoryId(catId);
            setActiveModal('create-channel');
          }}
          onEditChannel={(channel) => {
            setTargetChannelForAction(channel);
            setActiveModal('edit-channel');
          }}
          onOpenServerBoost={() => setAppView('server-settings')}
          onOpenServerProfile={() => setAppView('server-settings')}
          onLeaveServer={() => {
            setConfirmAction('leave-server');
            setConfirmTargetName(currentServer.name);
            setActiveModal('confirm-action');
          }}
          onDeleteServer={() => {
            setConfirmAction('delete-server');
            setConfirmTargetName(currentServer.name);
            setActiveModal('confirm-action');
          }}
          onChangeStatus={(st: Status) => setCurrentUser((u) => ({ ...u, status: st }))}
          onSaveCustomStatus={(cs: string) => setCurrentUser((u) => ({ ...u, customStatus: cs }))}
          onEditProfile={() => setAppView('own-profile')}
          onBuyPoints={() => setAppView('user-settings')}
          onSubscribePremium={() => setAppView('user-settings')}
          onLogout={handleLogout}
        />
      )}

      {/* Nivel 3: Contenido Principal */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {selectedServerId === 'home' ? (
          <HomeView
            userPanel={
              <UserPanel
                currentUser={currentUser}
                isMuted={isMuted}
                isDeafened={isDeafened}
                onToggleMute={() => setIsMuted((m) => !m)}
                onToggleDeafen={() => setIsDeafened((d) => !d)}
                onOpenSettings={() => setAppView('user-settings')}
                inVoiceChannel={inVoiceChannelId !== null}
                voiceChannelName={activeVoice?.ch.name}
                voiceServerName={activeVoice?.srv.name}
                onDisconnectVoice={handleDisconnectVoice}
                onChangeStatus={(st: Status) => setCurrentUser((u) => ({ ...u, status: st }))}
                onSaveCustomStatus={(cs: string) => setCurrentUser((u) => ({ ...u, customStatus: cs }))}
                onEditProfile={() => setAppView('own-profile')}
                onBuyPoints={() => setAppView('user-settings')}
                onSubscribePremium={() => setAppView('user-settings')}
                onLogout={handleLogout}
              />
            }
            currentUserId={currentUser.id}
            directMessages={directMessagesList}
            activeDirectMessageId={selectedDmId}
            onSelectDirectMessage={(id) => setSelectedDmId(id)}
            onOpenUserProfile={handleOpenUserProfile}
            onSendMessage={(_dmId, text) => handleSendMessage(text, undefined, undefined)}
          />
        ) : appView === 'voice' ? (
          <VoiceView
            channelName={currentChannel?.name || 'Voz'}
            serverName={currentServer?.name}
            currentUserId={currentUser.id}
            participants={[currentUser]}
            isMuted={isMuted}
            isDeafened={isDeafened}
            isVideoOn={isVideoOn}
            isScreenSharing={isScreenSharing}
            onToggleMute={() => setIsMuted((m) => !m)}
            onToggleDeafen={() => setIsDeafened((d) => !d)}
            onToggleVideo={() => setIsVideoOn((v) => !v)}
            onToggleScreenShare={() => setIsScreenSharing((s) => !s)}
            onDisconnect={handleDisconnectVoice}
            onSelectUser={(u) => handleOpenUserProfile(u.id)}
          />
        ) : (
          <ChatView
            channel={currentChannel}
            messages={activeMessages}
            isLoading={isLoadingMessages}
            currentUserId={currentUser.id}
            users={usersMap}
            isMemberListOpen={isMemberListOpen}
            onToggleMemberList={() => setIsMemberListOpen((v) => !v)}
            onSendMessage={handleSendMessage}
            onToggleReaction={handleToggleReaction}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
            onOpenUserProfile={handleOpenUserProfile}
            onStartVoiceCall={() => {
              const vChan = allServerChannels.find((c) => c.type === 'voice');
              if (vChan) handleJoinVoiceChannel(vChan.id);
            }}
          />
        )}

        {/* Lista de Miembros (Panel derecho en canales de servidor) */}
        {selectedServerId !== 'home' && isMemberListOpen && appView === 'chat' && (
          <MemberList
            members={serverMembersAsUsers.map(u => usersMap[u.id] || u)}
            roles={currentServer?.roles || []}
            onSelectMember={(m) => handleOpenUserProfile(m.id)}
            currentUserId={currentUser.id}
          />
        )}
      </div>

      {/* ── MODALES GLOBALES ── */}
      <GlobalModals 
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        confirmAction={confirmAction}
        setConfirmAction={setConfirmAction}
        confirmTargetName={confirmTargetName}
        currentServer={currentServer}
        currentUser={currentUser}
        usersMap={usersMap}
        selectedProfileUserId={selectedProfileUserId}
        setSelectedProfileUserId={setSelectedProfileUserId}
        setSelectedServerId={setSelectedServerId}
        setSelectedChannelId={setSelectedChannelId}
        setAppView={setAppView}
        setInVoiceChannelId={setInVoiceChannelId}
        showToast={showToast}
        handleCreateServer={handleCreateServer}
        createChannelMutation={createChannelMutation}
        editChannelMutation={editChannelMutation}
        deleteChannelMutation={deleteChannelMutation}
        channelModalCategoryId={channelModalCategoryId}
        targetChannelForAction={targetChannelForAction}
        incomingCaller={incomingCaller}
        setIncomingCaller={setIncomingCaller}
      />
    </div>
  );
}

