import { useMemo, useState, type FormEvent } from 'react';
import {
  buildDmList,
  useBlocksQuery,
  useConversationsQuery,
  useFriendRequestsQuery,
  useFriendsQuery,
  usePresenceQuery,
  useSendFriendRequestMutation,
  type DmListItem,
} from '@discordia/core';
import type { User } from '../../types';
import { useUsers } from '../../app/usersContext';
import { profileToUser } from './profileUser';
import { friendRequestErrorMessage } from './useRelationshipActions';

/** Pestañas disponibles dentro de la sección de Amigos. */
export type FriendsTab = 'online' | 'all' | 'pending' | 'blocked' | 'add-friend';

/** Una fila de la lista de chats: lo que dice core más el usuario que se muestra. */
export type DmRow = DmListItem & { user: User };

const matches = (user: User, query: string) =>
  user.displayName.toLowerCase().includes(query) || user.username.toLowerCase().includes(query);

/** Lista de chats y sección Amigos del inicio. Lo que viene del backend está en los hooks de core. */
export function useHomeState() {
  const { userOrFallback } = useUsers();
  const conversations = useConversationsQuery();
  const friendRequests = useFriendRequestsQuery();
  const friends = useFriendsQuery();
  const blocks = useBlocksQuery();
  const sendRequest = useSendFriendRequestMutation();

  // Estado de pestañas de amigos
  const [activeTab, setActiveTab] = useState<FriendsTab>('online');
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [dmSearchQuery, setDmSearchQuery] = useState('');

  // Formulario "Añadir Amigo"
  const [addFriendTarget, setAddFriendTarget] = useState('');
  const [addFriendMessage, setAddFriendMessage] = useState('');
  const [addFriendSuccess, setAddFriendSuccess] = useState<string | null>(null);
  const [addFriendError, setAddFriendError] = useState<string | null>(null);

  const dmList = useMemo(
    () => buildDmList(conversations.data, friendRequests.data?.incoming),
    [conversations.data, friendRequests.data]
  );

  const presenceIds = useMemo(
    () => [...dmList.map((item) => item.userId), ...(friends.data ?? []).map((friend) => friend.id)],
    [dmList, friends.data]
  );
  const { data: presence } = usePresenceQuery(presenceIds);

  // Las conversaciones traen solo el id: el nombre sale de los perfiles de la app
  const dmRows = useMemo<DmRow[]>(
    () =>
      dmList.map((item) => ({
        ...item,
        user:
          item.kind === 'friend_request'
            ? profileToUser(item.friendRequest.user, presence)
            : { ...userOrFallback(item.userId), status: presence?.[item.userId] ?? 'offline' },
      })),
    [dmList, presence, userOrFallback]
  );

  const filteredDms = useMemo(() => {
    const query = dmSearchQuery.trim().toLowerCase();
    return query ? dmRows.filter((row) => matches(row.user, query)) : dmRows;
  }, [dmRows, dmSearchQuery]);

  const allFriends = useMemo(() => (friends.data ?? []).map((friend) => profileToUser(friend, presence)), [friends.data, presence]);
  const onlineFriends = useMemo(() => allFriends.filter((friend) => friend.status === 'online'), [allFriends]);
  const blockedUsers = useMemo(() => (blocks.data ?? []).map((user) => profileToUser(user)), [blocks.data]);

  // Filtrado de amigos según pestaña y búsqueda
  const displayedFriends = useMemo(() => {
    const list = activeTab === 'online' ? onlineFriends : activeTab === 'all' ? allFriends : activeTab === 'blocked' ? blockedUsers : [];
    const query = friendsSearchQuery.trim().toLowerCase();
    return query ? list.filter((user) => matches(user, query)) : list;
  }, [activeTab, onlineFriends, allFriends, blockedUsers, friendsSearchQuery]);

  const handleSendFriendRequest = async (e: FormEvent) => {
    e.preventDefault();
    const target = addFriendTarget.trim();
    if (!target || sendRequest.isPending) return;
    setAddFriendSuccess(null);
    setAddFriendError(null);
    try {
      await sendRequest.mutateAsync({ target, message: addFriendMessage.trim() || undefined });
    } catch (err) {
      setAddFriendError(friendRequestErrorMessage(err, target));
      return;
    }
    // Igual con 201 y con 202: nunca confirma si el email existe ni si hay un bloqueo
    setAddFriendSuccess(`¡Éxito! Tu solicitud de amistad a ${target} fue enviada.`);
    setAddFriendTarget('');
    setAddFriendMessage('');
    setTimeout(() => setAddFriendSuccess(null), 4000);
  };

  return {
    conversations,
    friendRequests,
    friends,
    blocks,
    incomingRequests: friendRequests.data?.incoming ?? [],
    outgoingRequests: friendRequests.data?.outgoing ?? [],
    activeTab,
    setActiveTab,
    friendsSearchQuery,
    setFriendsSearchQuery,
    dmSearchQuery,
    setDmSearchQuery,
    addFriendTarget,
    setAddFriendTarget,
    addFriendMessage,
    setAddFriendMessage,
    addFriendSuccess,
    addFriendError,
    isSendingFriendRequest: sendRequest.isPending,
    allFriends,
    onlineFriends,
    filteredDms,
    displayedFriends,
    handleSendFriendRequest,
  };
}

export type HomeState = ReturnType<typeof useHomeState>;
