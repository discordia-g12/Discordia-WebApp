import { useEffect, useRef, type KeyboardEvent } from 'react';
import {
  canInChannel,
  errorMessageFor,
  isConversationId,
  useSendThreadReply,
  useThreadMute,
  useThreadQuery,
} from '@discordia/core';
import { showToast, useUIStore, type OpenThread } from '../../app/uiStore';
import { useUsers } from '../../app/usersContext';
import { useCurrentServer } from '../servers/useCurrentServer';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile } from '../profile/profileActions';
import { ChatView } from './ChatView';
import { useChatWriteBlock } from './chatConnectionContext';
import { useMessageActions } from './useMessageActions';
import styles from './ThreadPanel.module.css';

const SEND_ERRORS = {
  400: 'No se puede responder a ese mensaje en un hilo.',
  403: 'No tenés permiso para responder en este hilo.',
  404: 'El mensaje original ya no existe.',
};

/** Hilo abierto (panel derecho en escritorio, pantalla propia en mobile web). */
export function ThreadPanel({ thread }: { thread: OpenThread }) {
  const { channelId, messageId, serverId } = thread;
  const close = () => useUIStore.getState().setOpenThread(null);
  const { currentServer } = useCurrentServer();
  const currentUser = useCurrentUser();
  const { usersMap } = useUsers();
  const writeBlock = useChatWriteBlock();
  const isDm = isConversationId(channelId);

  const query = useThreadQuery(channelId, messageId);
  const send = useSendThreadReply(channelId, messageId);
  const actions = useMessageActions(channelId);
  const mute = useThreadMute(messageId, serverId);

  // Los permisos son los del canal: el hilo se abre desde el canal en pantalla
  const channel = currentServer?.categories.flatMap((c) => c.channels).find((c) => c.id === channelId) ?? null;
  const can = (permission: 'MANAGE_MESSAGES' | 'ADD_REACTIONS') =>
    channel ? canInChannel(currentServer, channel, currentUser.id, permission) : false;
  const dmTarget = useUIStore((s) => s.selectedDm);
  const dmUser = dmTarget?.type === 'chat' ? usersMap[dmTarget.userId] : undefined;
  const locationLabel = isDm
    ? `el chat con ${dmUser?.displayName ?? 'esta persona'}`
    : channel
      ? `•${channel.name}`
      : 'este canal';

  // Accesibilidad: al abrir, el foco va a la barra de escritura; al cerrar, vuelve a donde estaba
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    rootRef.current?.querySelector<HTMLElement>('textarea, input[type="text"]')?.focus();
    return () => previous?.focus?.();
  }, [messageId]);

  const onKeyDown = (event: KeyboardEvent) => {
    // Los popovers de los mensajes cierran con Escape antes (y marcan el evento): solo cierra si nadie lo usó
    if (event.key === 'Escape' && !event.defaultPrevented) close();
  };

  if (query.isError) {
    return (
      <aside ref={rootRef} className={styles.panel} aria-label="Hilo" onKeyDown={onKeyDown}>
        <p className={styles.error} role="alert">
          No se pudo abrir el hilo.{' '}
          <button type="button" className={styles.link} onClick={() => void query.refetch()}>
            reintentar
          </button>{' '}
          ·{' '}
          <button type="button" className={styles.link} onClick={close}>
            cerrar
          </button>
        </p>
      </aside>
    );
  }

  return (
    <aside ref={rootRef} className={styles.panel} aria-label="Hilo" onKeyDown={onKeyDown}>
      <ChatView
        channel={channel}
        thread={{
          parent: query.parent,
          locationLabel,
          onClose: close,
          muted: mute.muted,
          onToggleMute: () => {
            mute.setMuted(!mute.muted).catch(() => showToast('No se pudo cambiar el aviso del hilo', 'danger'));
          },
          hasMore: query.hasMore,
          isLoadingMore: query.isFetchingMore,
          onLoadMore: () => void query.fetchMore(),
        }}
        messages={query.replies}
        isLoading={query.isPending}
        currentUserId={currentUser.id}
        users={usersMap}
        canManageMessages={!isDm && can('MANAGE_MESSAGES')}
        canAddReactions={isDm || can('ADD_REACTIONS')}
        canPinMessages={false}
        pinnedMessages={[]}
        writeBlock={isDm ? null : writeBlock}
        onSendMessage={(content, attachment) => {
          send(content, attachment).catch((err) => showToast(errorMessageFor(err, SEND_ERRORS, 'No se pudo enviar la respuesta'), 'danger'));
        }}
        onToggleReaction={actions.toggleReaction}
        onDeleteMessage={actions.deleteMessage}
        onEditMessage={actions.editMessage}
        onOpenUserProfile={openUserProfile}
      />
    </aside>
  );
}
