import type { ReactNode } from 'react';
import {
  dmActions,
  friendRequestJoke,
  friendRequestTitle,
  messageRequestTitle,
  mentionsToText,
  useAcceptConversationMutation,
  useDeclineConversationMutation,
  type Conversation,
  type FriendRequest,
  type PublicProfile,
} from '@discordia/core';
import type { User } from '../../types';
import { showToast } from '../../app/uiStore';
import { useUsers } from '../../app/usersContext';
import { ActionLink, BlockButton, SquareAvatar } from '../../ui';
import { mentionLabel } from '../chat/useChatViewState';
import { profileToUser } from './profileUser';
import { useRelationshipActions } from './useRelationshipActions';
import styles from './RequestCards.module.css';

/** Tarjeta de una solicitud: quién es, qué pide y qué se puede hacer. Ocupa el lugar del chat. */
function RequestCard({
  user,
  title,
  onOpenProfile,
  children,
  actions,
}: {
  user: User;
  title: string;
  onOpenProfile: () => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <span className={styles.headerName}>{user.displayName}</span>
        <ActionLink onPress={onOpenProfile}>perfil</ActionLink>
      </header>
      <article className={styles.card} aria-label={title}>
        <button type="button" className={styles.avatar} onClick={onOpenProfile} aria-label={`Ver perfil de ${user.displayName}`}>
          <SquareAvatar user={user} size="lg" />
        </button>
        <h1 className={styles.title}>{title}</h1>
        {children}
        <div className={styles.actions}>{actions}</div>
      </article>
    </div>
  );
}

/** Solicitud de amistad recibida: "X quiere ser tu amigo", su descripción y el chiste. */
export function FriendRequestView({
  request,
  onAccepted,
  onDeclined,
  onOpenUserProfile,
}: {
  request: FriendRequest;
  onAccepted: (friendId: string) => void;
  onDeclined: () => void;
  onOpenUserProfile: (userId: string) => void;
}) {
  const relationship = useRelationshipActions();
  const user = profileToUser(request.user);

  const accept = async () => {
    const friendId = await relationship.acceptFriend(request.id);
    if (friendId) onAccepted(friendId);
  };

  const decline = async () => {
    if (await relationship.declineFriend(request.id, user.id)) onDeclined();
  };

  return (
    <RequestCard
      user={user}
      title={friendRequestTitle(user.displayName)}
      onOpenProfile={() => onOpenUserProfile(user.id)}
      actions={
        <>
          <BlockButton onPress={accept}>Aceptar</BlockButton>
          <ActionLink onPress={decline}>rechazar</ActionLink>
        </>
      }
    >
      {request.message && <p className={styles.quote}>{request.message}</p>}
      <p className={styles.hint}>/ {friendRequestJoke(request.id)}</p>
    </RequestCard>
  );
}

/** Solicitud de mensaje recibida: no se puede responder sin aceptar, y aceptar no los hace amigos. */
export function MessageRequestView({
  conversation,
  user,
  profile,
  onClose,
  onOpenUserProfile,
}: {
  conversation: Conversation;
  user: User;
  profile?: PublicProfile;
  onClose: () => void;
  onOpenUserProfile: (userId: string) => void;
}) {
  const { usersMap } = useUsers();
  const relationship = useRelationshipActions();
  const acceptConversation = useAcceptConversationMutation();
  const declineConversation = useDeclineConversationMutation();
  const can = dmActions({ relationship: profile?.relationship ?? 'none', conversation });

  const accept = () =>
    acceptConversation.mutate(conversation.id, {
      onError: () => showToast('No se pudo aceptar el mensaje', 'danger'),
    });

  const decline = () =>
    declineConversation.mutate(conversation.id, {
      onSuccess: onClose,
      onError: () => showToast('No se pudo rechazar el mensaje', 'danger'),
    });

  const preview = mentionsToText(conversation.lastMessage?.content ?? '', {
    user: (id) => (usersMap[id] ? mentionLabel(usersMap[id]) : 'usuario-desconocido'),
    role: () => 'rol',
  });

  return (
    <RequestCard
      user={user}
      title={messageRequestTitle(user.displayName)}
      onOpenProfile={() => onOpenUserProfile(user.id)}
      actions={
        <>
          <BlockButton onPress={accept} loading={acceptConversation.isPending}>
            Aceptar
          </BlockButton>
          <ActionLink onPress={decline} disabled={declineConversation.isPending}>
            rechazar
          </ActionLink>
          <ActionLink onPress={() => relationship.blockFromMessageRequest(conversation.id, user.id, user.displayName, onClose)}>
            bloquear
          </ActionLink>
          {can.canAddFriend && <ActionLink onPress={() => relationship.addFriend(user.id)}>agregar amigo</ActionLink>}
        </>
      }
    >
      <p className={styles.quote}>{preview}</p>
      <p className={styles.hint}>/ si aceptás pueden escribirse, pero no quedan como amigos.</p>
    </RequestCard>
  );
}
