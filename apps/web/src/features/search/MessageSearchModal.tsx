import { useId, useMemo } from 'react';
import {
  MESSAGE_SEARCH_MAX_LENGTH,
  formatMessageTime,
  mentionsToText,
  useChannelMessageSearch,
  useMessageSearch,
  useRolesQuery,
  useUserProfiles,
} from '@discordia/core';
import type { Channel, Message, Role, Server, User } from '../../types';
import { ActionLink, BlockButton, EmptyState, Modal, ModalActions, ModalForm, Skeleton, SquareAvatar, UnderlineInput } from '../../ui';
import { useUIStore } from '../../app/uiStore';
import { useUsers } from '../../app/usersContext';
import { useServerMemberUsers } from '../servers/useCurrentServer';
import { useCurrentUser } from '../profile/currentUserStore';
import styles from './MessageSearchModal.module.css';

const userName = (user: User | undefined) => user?.displayName || user?.username || 'usuario';

/** Estado de una búsqueda (de un servidor o de un DM): lo crea el contenedor con el alcance que corresponde. */
export type MessageSearchState = ReturnType<typeof useMessageSearch>;

/**
 * Búsqueda de mensajes del servidor abierto: junta los miembros (para el filtro por autor), los usuarios
 * conocidos y los roles (para mostrar las menciones), y al elegir un resultado abre su canal.
 */
export function MessageSearchModal({ server, onClose }: { server: Server; onClose: () => void }) {
  const members = useServerMemberUsers();
  const { usersMap } = useUsers();
  const { data: roles } = useRolesQuery(server.id);
  const search = useMessageSearch(server.id);
  const channels = useMemo(
    () => (server.channels?.length ? server.channels : server.categories.flatMap((cat) => cat.channels)),
    [server]
  );

  const openMessage = (message: Message) => {
    const ui = useUIStore.getState();
    ui.setSelectedChannelId(message.channelId);
    ui.setAppView('chat');
    onClose();
  };

  return (
    <MessageSearchDialog
      search={search}
      description={`en ${server.name}`}
      scopeHint="en los canales que podés ver"
      channels={channels}
      members={members.map((member) => ({ ...member, ...usersMap[member.id] }))}
      users={usersMap}
      roles={roles ?? []}
      onClose={onClose}
      onOpenMessage={openMessage}
    />
  );
}

/**
 * Búsqueda dentro del DM abierto: el filtro por autor son los dos participantes y al elegir un resultado se va
 * a ese mensaje en el chat (`onJump`, el mismo salto de los mensajes fijados).
 */
export function DmMessageSearchModal({
  conversationId,
  otherUser,
  onClose,
  onJump,
}: {
  conversationId: string;
  otherUser: User;
  onClose: () => void;
  onJump: (messageId: string) => void;
}) {
  const { usersMap } = useUsers();
  const currentUser = useCurrentUser();
  const search = useChannelMessageSearch(conversationId);

  return (
    <MessageSearchDialog
      search={search}
      description={`en tu conversación con ${userName(otherUser)}`}
      scopeHint="en esta conversación"
      // Chat-Engine toma el id de quien busca como su id canónico, el que guardan sus mensajes del DM
      members={[currentUser, otherUser]}
      users={usersMap}
      roles={[]}
      onClose={onClose}
      onOpenMessage={(message) => {
        onClose();
        onJump(message.id);
      }}
    />
  );
}

export interface MessageSearchDialogProps {
  search: MessageSearchState;
  /** Bajada del título: dónde se busca ("en Mi server"). */
  description: string;
  /** Final del estado vacío: "en los canales que podés ver", "en esta conversación". */
  scopeHint: string;
  /** Canales del servidor, para mostrar en cuál está cada resultado. Sin esto (DM) no se muestra el canal. */
  channels?: Channel[];
  /** Miembros del servidor: las opciones del filtro por autor. */
  members: User[];
  /** Usuarios conocidos por id (autores y menciones). */
  users: Record<string, User>;
  roles: Role[];
  onClose: () => void;
  onOpenMessage: (message: Message) => void;
}

/** Formulario (texto y autor), resultados del más nuevo al más viejo y "cargar más". */
export function MessageSearchDialog({
  search,
  description,
  scopeHint,
  channels,
  members,
  users,
  roles,
  onClose,
  onOpenMessage,
}: MessageSearchDialogProps) {
  const authorSelectId = useId();

  // Autores que no están en el directorio (por ejemplo, alguien que ya dejó el servidor)
  const unknownAuthorIds = search.messages.map((m) => m.authorId).filter((id) => !users[id]);
  const fetched = useUserProfiles(unknownAuthorIds);
  const userById = (id: string): User | undefined => users[id] ?? fetched[id];

  const channelName = (id: string) => channels?.find((ch) => ch.id === id)?.name ?? 'canal';
  const names = {
    user: (id: string) => userName(userById(id)),
    role: (id: string) => roles.find((r) => r.id === id)?.name ?? 'rol-eliminado',
  };
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => userName(a).localeCompare(userName(b), 'es')),
    [members]
  );

  const submitted = search.submitted;
  const emptyHint = submitted
    ? [
        submitted.query ? `ningún mensaje contiene "${submitted.query}"` : 'no hay mensajes',
        submitted.authorId ? `de ${userName(userById(submitted.authorId))}` : null,
        scopeHint,
      ]
        .filter(Boolean)
        .join(' ')
    : undefined;

  return (
    <Modal title="Buscar mensajes" description={description} onClose={onClose}>
      <ModalForm onSubmit={search.submit}>
        <UnderlineInput
          label="texto"
          placeholder="qué querés encontrar"
          value={search.query}
          maxLength={MESSAGE_SEARCH_MAX_LENGTH}
          onChange={(e) => search.setQuery(e.target.value)}
          autoFocus
        />
        <div className={styles.selectField}>
          <label htmlFor={authorSelectId} className={styles.fieldLabel}>
            autor
          </label>
          <select
            id={authorSelectId}
            value={search.authorId ?? ''}
            onChange={(e) => search.setAuthorId(e.target.value || null)}
          >
            <option value="">cualquiera</option>
            {sortedMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {userName(member)}
              </option>
            ))}
          </select>
        </div>
        <ModalActions>
          {submitted && <ActionLink onPress={search.clear}>limpiar</ActionLink>}
          <BlockButton type="submit" disabled={!search.canSubmit} loading={search.isLoading}>
            Buscar
          </BlockButton>
        </ModalActions>
      </ModalForm>

      <section className={styles.results} aria-label="Resultados de la búsqueda" aria-live="polite">
        {!submitted ? null : search.isLoading ? (
          <Skeleton lines={4} label="Buscando mensajes" />
        ) : search.error ? (
          <div className={styles.errorBox}>
            <EmptyState title="no se pudo buscar" hint={search.errorMessage ?? undefined} />
            <ActionLink onPress={() => void search.refetch()}>reintentar</ActionLink>
          </div>
        ) : search.isEmpty ? (
          <EmptyState title="sin resultados" hint={emptyHint} />
        ) : (
          <>
            <ol className={styles.list}>
              {search.messages.map((message) => {
                const author = userById(message.authorId);
                return (
                  <li key={message.id}>
                    <button
                      type="button"
                      className={styles.result}
                      onClick={() => onOpenMessage(message)}
                      title={channels ? `Ir a •${channelName(message.channelId)}` : 'Ir al mensaje'}
                    >
                      <SquareAvatar user={{ displayName: userName(author), username: author?.username ?? message.authorId, avatar: author?.avatar }} size="sm" />
                      <span className={styles.body}>
                        <span className={styles.meta}>
                          <strong>{userName(author)}</strong>
                          {channels && <span>•{channelName(message.channelId)}</span>}
                          <time dateTime={message.timestamp}>{formatMessageTime(message.timestamp)}</time>
                        </span>
                        <span className={styles.content}>
                          {message.content
                            ? mentionsToText(message.content, names)
                            : message.attachments?.length
                              ? `/ ${message.attachments.length} adjunto(s)`
                              : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {search.hasNextPage && (
              <BlockButton
                className={styles.loadMore}
                loading={search.isFetchingNextPage}
                onPress={() => void search.loadMore()}
              >
                Cargar más resultados
              </BlockButton>
            )}
          </>
        )}
      </section>
    </Modal>
  );
}
