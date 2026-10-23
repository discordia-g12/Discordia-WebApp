import { useMemo, useState, type FormEvent } from 'react';
import type { DirectMessage, User } from '../../types';

/** Pestañas disponibles dentro de la sección de Amigos. */
export type FriendsTab = 'online' | 'all' | 'pending' | 'blocked' | 'add-friend';

/** Solicitud de amistad simulada para la pestaña Pendiente. */
export interface FriendRequest {
  id: string;
  user: User;
  type: 'incoming' | 'outgoing';
}

export interface HomeStateOptions {
  currentUserId?: string;
  directMessages?: DirectMessage[];
  /** DM activo controlado desde afuera (null: amigos). Sin definir, lo maneja el hook. */
  activeDirectMessageId?: string | null;
  onSelectDirectMessage?: (dmId: string | null) => void;
}

/**
 * Estado del inicio (mensajes directos y amigos), compartido por la vista del rediseño (HomeView) y la
 * anterior (legacy/LegacyHomeView). Todavía no hay backend de amigos: la lista sale vacía y las
 * solicitudes y bloqueos son locales.
 */
export function useHomeState({
  currentUserId,
  directMessages = [],
  activeDirectMessageId: externalActiveDmId,
  onSelectDirectMessage,
}: HomeStateOptions) {
  // Estado local para DM seleccionado si no es controlado exteriormente
  const [internalActiveDmId, setInternalActiveDmId] = useState<string | null>(null);
  const activeDmId = externalActiveDmId !== undefined ? externalActiveDmId : internalActiveDmId;

  // Estado de pestañas de amigos
  const [activeTab, setActiveTab] = useState<FriendsTab>('online');
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [dmSearchQuery, setDmSearchQuery] = useState('');

  // Formulario "Añadir Amigo"
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendSuccess, setAddFriendSuccess] = useState<string | null>(null);

  // Lista local de solicitudes pendientes
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

  // Lista de usuarios bloqueados simulados
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // Directorio de todos los amigos (excluyendo al usuario actual)
  const allFriends = useMemo(() => {
    return ([] as User[]).filter((u) => u.id !== currentUserId);
  }, [currentUserId]);

  // Amigos conectados (status != offline)
  const onlineFriends = useMemo(() => {
    return allFriends.filter(
      (u) => u.status !== 'offline' && u.status !== 'invisible' && !blockedUserIds.includes(u.id)
    );
  }, [allFriends, blockedUserIds]);

  // Filtrado de DMs en la barra lateral
  const filteredDms = useMemo(() => {
    if (!dmSearchQuery.trim()) return directMessages;
    const q = dmSearchQuery.toLowerCase();
    return directMessages.filter((dm) => {
      const name = dm.recipient?.displayName.toLowerCase() || '';
      const user = dm.recipient?.username.toLowerCase() || '';
      return name.includes(q) || user.includes(q);
    });
  }, [directMessages, dmSearchQuery]);

  // DM activo actual
  const activeDm = useMemo(() => {
    if (!activeDmId) return null;
    return directMessages.find((dm) => dm.id === activeDmId) || null;
  }, [activeDmId, directMessages]);

  const selectDm = (dmId: string | null) => {
    if (onSelectDirectMessage) {
      onSelectDirectMessage(dmId);
    } else {
      setInternalActiveDmId(dmId);
    }
  };

  /** Abre el DM con un amigo (el existente, o uno nuevo con su id). */
  const messageFriend = (friendId: string) => {
    const existingDm = directMessages.find((dm) => dm.recipientId === friendId);
    selectDm(existingDm ? existingDm.id : `dm-${friendId}`);
  };

  const handleAcceptRequest = (reqId: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleDeclineRequest = (reqId: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleUnblock = (userId: string) => {
    setBlockedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleSendFriendRequest = (e: FormEvent) => {
    e.preventDefault();
    if (!addFriendInput.trim()) return;
    setAddFriendSuccess(`¡Éxito! Tu solicitud de amistad a ${addFriendInput} fue enviada.`);
    setAddFriendInput('');
    setTimeout(() => setAddFriendSuccess(null), 4000);
  };

  // Filtrado de amigos según pestaña y búsqueda
  const displayedFriends = useMemo(() => {
    let list: User[] = [];
    if (activeTab === 'online') {
      list = onlineFriends;
    } else if (activeTab === 'all') {
      list = allFriends.filter((u) => !blockedUserIds.includes(u.id));
    } else if (activeTab === 'blocked') {
      list = allFriends.filter((u) => blockedUserIds.includes(u.id));
    }

    if (!friendsSearchQuery.trim()) return list;
    const q = friendsSearchQuery.toLowerCase();
    return list.filter((u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
  }, [activeTab, onlineFriends, allFriends, blockedUserIds, friendsSearchQuery]);

  return {
    activeDmId,
    activeDm,
    selectDm,
    messageFriend,
    activeTab,
    setActiveTab,
    friendsSearchQuery,
    setFriendsSearchQuery,
    dmSearchQuery,
    setDmSearchQuery,
    addFriendInput,
    setAddFriendInput,
    addFriendSuccess,
    pendingRequests,
    allFriends,
    onlineFriends,
    filteredDms,
    displayedFriends,
    handleAcceptRequest,
    handleDeclineRequest,
    handleUnblock,
    handleSendFriendRequest,
  };
}

export type HomeState = ReturnType<typeof useHomeState>;
