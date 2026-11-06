import { Fragment, useCallback, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Paperclip, Smile } from 'lucide-react';
import { distances } from '@discordia/tokens';
import {
  formatDayLabel,
  formatMessageHour,
  formatMessageTime,
  mentionsToText,
  mentionsUser,
  placeMessage,
  splitMentions,
  ATTACHMENT_ACCEPT,
  formatAttachmentSize,
  type MessageMentions,
} from '@discordia/core';
import type { Channel, Message, MessageAttachment, Role, User } from '../../types';
import { ActionLink, Skeleton, SquareAvatar, transitions } from '../../ui';
import {
  POPULAR_EMOJIS,
  QUICK_EMOJIS,
  mentionLabel,
  sanitizeText,
  useChatViewState,
  type ChatViewState,
  type DirectChat,
  type Mentionables,
} from './useChatViewState';
import styles from './ChatView.module.css';

export interface ChatViewProps {
  /** Canal activo si la vista corresponde a un servidor. */
  channel?: Channel | null;
  /** Chat directo activo si la vista corresponde a un DM. */
  directChat?: DirectChat | null;
  /** Enlaces del encabezado de un DM, después de _perfil: agregar amigo, bloquear... */
  directActions?: { label: string; onPress: () => void }[];
  /** Lista opcional de mensajes. Si no se provee, usa los datos mock. */
  messages?: Message[];
  /** ID del usuario actualmente autenticado. */
  currentUserId?: string;
  /** Directorio de usuarios para resolver autores y menciones. */
  users?: Record<string, User>;
  /** Canal de servidor: a quién se puede mencionar y los roles propios. Sin esto (DMs) no hay roles ni @everyone. */
  mentionables?: Mentionables;
  /** Indica si los mensajes se están cargando desde el servidor. */
  isLoading?: boolean;
  /** Callback al despachar un nuevo mensaje de texto o adjunto. */
  onSendMessage?: (content: string, attachment?: MessageAttachment, replyToId?: string) => void;
  /** Callback al alternar una reacción emoji. */
  onToggleReaction?: (messageId: string, emoji: string) => void;
  /** Callback al eliminar un mensaje. */
  onDeleteMessage?: (messageId: string) => void;
  /** Callback al confirmar la edición de un mensaje existente. */
  onEditMessage?: (messageId: string, newContent: string) => void;
  /** Callback al fijar o desfijar un mensaje. */
  onPinMessage?: (messageId: string) => void;
  /** Callback para abrir el perfil del usuario clicado. */
  onOpenUserProfile?: (userId: string) => void;
  /** Callback para mostrar u ocultar la barra lateral de miembros. */
  onToggleMemberList?: () => void;
  /** Estado de visibilidad de la barra lateral de miembros. */
  isMemberListOpen?: boolean;
  /**
   * Si no se puede escribir (silenciado, sin permiso, fuera del servidor), el motivo: el input queda
   * deshabilitado y se muestra esto. null o sin definir: se puede escribir.
   */
  writeBlock?: string | null;
  /** Hay mensajes anteriores a los cargados: arriba se ofrece cargarlos en vez del comienzo del canal. */
  hasOlderMessages?: boolean;
  /** Se están pidiendo los mensajes anteriores. */
  isLoadingOlder?: boolean;
  /** Pide la página anterior del historial. */
  onLoadOlder?: () => void;
}


const UNKNOWN_USER = { username: 'desconocido', displayName: 'Desconocido', status: 'offline' } as const;

/** Cómo se nombran las menciones de un mensaje: usuarios del directorio y roles del servidor. */
interface MentionNames {
  user: (id: string) => string;
  role: (id: string) => string;
}

function useMentionNames(users: Record<string, User>, roles: Role[] = []): MentionNames {
  return {
    user: (id) => (users[id] ? mentionLabel(users[id]) : 'usuario-desconocido'),
    role: (id) => roles.find((r) => r.id === id)?.name ?? 'rol-eliminado',
  };
}

/**
 * Ids de los mensajes que ya estaban al abrir la conversación, más los anteriores que se cargan después:
 * esos no se animan. Los que llegan al final (enviados o recibidos por el WebSocket) entran subiendo.
 */
function useHistoryIds(conversationKey: string, messages: Message[], isLoading: boolean) {
  const state = useRef<{ key: string | null; ready: boolean; ids: Set<string> }>({ key: null, ready: false, ids: new Set() });
  if (state.current.key !== conversationKey) state.current = { key: conversationKey, ready: false, ids: new Set() };
  if (!state.current.ready && !isLoading) {
    messages.forEach((m) => state.current.ids.add(m.id));
    state.current.ready = true;
  } else if (state.current.ready) {
    // Los que aparecen arriba del primero conocido son historial (una página anterior)
    for (const m of messages) {
      if (state.current.ids.has(m.id)) break;
      state.current.ids.add(m.id);
    }
  }
  return state.current.ids;
}

/** Distancia al borde de arriba (px) desde la que, subiendo, se piden los mensajes anteriores. */
const LOAD_OLDER_THRESHOLD = 200;

/**
 * Carga de mensajes anteriores: se piden al subir cerca del borde de arriba (o con el enlace) y, cuando
 * llegan, el scroll se corrige para que lo que se estaba leyendo quede en el mismo lugar. Solo cuenta
 * el scroll hacia arriba: al abrir el canal se baja desde arriba y eso no tiene que pedir nada.
 */
function useLoadOlder(
  scrollRef: RefObject<HTMLDivElement | null>,
  firstMessageId: string | undefined,
  { hasOlder, isLoadingOlder, onLoadOlder }: { hasOlder: boolean; isLoadingOlder: boolean; onLoadOlder?: () => void }
) {
  // Distancia al final antes de pedir la página; null si no hay nada que restaurar
  const fromBottom = useRef<number | null>(null);
  const lastScrollTop = useRef(0);

  const loadOlder = useCallback(() => {
    const el = scrollRef.current;
    if (!onLoadOlder || !hasOlder || isLoadingOlder) return;
    fromBottom.current = el ? el.scrollHeight - el.scrollTop : null;
    onLoadOlder();
  }, [scrollRef, onLoadOlder, hasOlder, isLoadingOlder]);

  // Cuando termina el pedido (con la página nueva arriba, o con error), se restaura y se olvida
  useLayoutEffect(() => {
    if (isLoadingOlder) return;
    const el = scrollRef.current;
    if (el && fromBottom.current !== null) el.scrollTop = el.scrollHeight - fromBottom.current;
    fromBottom.current = null;
  }, [scrollRef, firstMessageId, isLoadingOlder]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < lastScrollTop.current && el.scrollTop < LOAD_OLDER_THRESHOLD) loadOlder();
    lastScrollTop.current = el.scrollTop;
  }, [scrollRef, loadOlder]);

  return { loadOlder, onScroll };
}

/**
 * Chat del rediseño (PDF, págs. 7 y 9), para canales y mensajes directos. Encabezado con el nombre y
 * enlaces de texto; mensajes con avatar cuadrado, metadato chico y texto grande, separados por día;
 * respuestas con una línea fina; reacciones y adjuntos sin bordes redondeados; barra de escritura de una
 * línea. La lógica es la de useChatViewState.
 */
export function ChatView(props: ChatViewProps) {
  const {
    channel,
    directChat,
    directActions = [],
    messages,
    isLoading = false,
    currentUserId,
    users = {},
    onOpenUserProfile,
    onToggleMemberList,
    isMemberListOpen = true,
    hasOlderMessages = false,
    isLoadingOlder = false,
    onLoadOlder,
  } = props;
  const chat = useChatViewState({ ...props, messages });
  const history = useHistoryIds(channel?.id ?? directChat?.conversationId ?? directChat?.user.id ?? 'chat', chat.localMessages, isLoading);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const older = useLoadOlder(scrollRef, chat.localMessages[0]?.id, {
    hasOlder: hasOlderMessages && !isLoading,
    isLoadingOlder,
    onLoadOlder,
  });
  const names = useMentionNames(users, props.mentionables?.roles);
  const myRoleIds = props.mentionables?.myRoleIds;

  return (
    <div className={styles.chat}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>{chat.isDirectMessage ? chat.chatTitle : `•${chat.chatTitle}`}</h1>
          {chat.chatTopic !== 'No topic set.' && <p className={styles.topic}>{chat.chatTopic}</p>}
        </div>
        <nav className={styles.links} aria-label="Acciones del chat">
          {chat.isDirectMessage ? (
            <>
              {directChat && <HeaderLink onPress={() => onOpenUserProfile?.(directChat.user.id)}>perfil</HeaderLink>}
              {directActions.map(({ label, onPress }) => (
                <HeaderLink key={label} onPress={onPress}>
                  {label}
                </HeaderLink>
              ))}
            </>
          ) : (
            <HeaderLink pressed={chat.isNotificationsMuted} onPress={() => chat.setIsNotificationsMuted((v) => !v)}>
              {chat.isNotificationsMuted ? 'activar notificaciones' : 'silenciar notificaciones'}
            </HeaderLink>
          )}
          <HeaderLink pressed={chat.isPinnedPanelOpen} onPress={() => chat.setIsPinnedPanelOpen((v) => !v)}>
            {`mensajes fijados${chat.pinnedMessages.length ? ` (${chat.pinnedMessages.length})` : ''}`}
          </HeaderLink>
          {!chat.isDirectMessage && onToggleMemberList && (
            <HeaderLink pressed={isMemberListOpen} onPress={onToggleMemberList}>
              {isMemberListOpen ? 'ocultar lista de miembros' : 'mostrar lista de miembros'}
            </HeaderLink>
          )}
        </nav>
      </header>

      {chat.isPinnedPanelOpen && <PinnedPanel chat={chat} users={users} names={names} />}

      <div
        ref={scrollRef}
        className={styles.scroll}
        role="log"
        aria-label={`Mensajes de ${chat.chatTitle}`}
        onScroll={older.onScroll}
      >
        {hasOlderMessages && !isLoading ? (
          <div className={styles.older}>
            {isLoadingOlder ? (
              <p className={styles.welcomeText} role="status">
                / cargando mensajes anteriores…
              </p>
            ) : (
              <ActionLink onPress={older.loadOlder}>cargar mensajes anteriores</ActionLink>
            )}
          </div>
        ) : (
          <div className={styles.welcome}>
            <p className={styles.welcomeTitle}>{chat.isDirectMessage ? chat.chatTitle : `•${chat.chatTitle}`}</p>
            <p className={styles.welcomeText}>
              /{' '}
              {chat.isDirectMessage
                ? `este es el comienzo de tu conversación con ${chat.chatTitle}.`
                : `este es el comienzo del canal •${chat.chatTitle}.`}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className={styles.loading}>
            <Skeleton lines={6} label="Cargando mensajes" />
          </div>
        ) : (
          <ol className={styles.messages}>
            {chat.localMessages.map((msg, index) => {
              const prev = index > 0 ? chat.localMessages[index - 1] : null;
              const { newDay, grouped: consecutive } = placeMessage(prev, msg);

              return (
                <Fragment key={msg.id}>
                  {newDay && (
                    <li className={styles.day} aria-label={formatDayLabel(newDay)}>
                      {formatDayLabel(newDay)}
                    </li>
                  )}
                  <MessageRow
                    msg={msg}
                    chat={chat}
                    users={users}
                    currentUserId={currentUserId}
                    myRoleIds={myRoleIds}
                    names={names}
                    consecutive={consecutive}
                    isNew={!history.has(msg.id)}
                    onOpenUserProfile={onOpenUserProfile}
                  />
                </Fragment>
              );
            })}
          </ol>
        )}
        <div ref={chat.messagesEndRef} />
      </div>

      <Composer chat={chat} users={users} writeBlock={props.writeBlock ?? null} />
    </div>
  );
}

function HeaderLink({ children, pressed, onPress }: { children: string; pressed?: boolean; onPress?: () => void }) {
  return (
    <button type="button" className={styles.headerLink} onClick={onPress} aria-pressed={pressed}>
      {children}
    </button>
  );
}

// ==========================================
// Mensajes
// ==========================================

function MessageRow({
  msg,
  chat,
  users,
  currentUserId,
  myRoleIds,
  names,
  consecutive,
  isNew,
  onOpenUserProfile,
}: {
  msg: Message;
  chat: ChatViewState;
  users: Record<string, User>;
  currentUserId?: string;
  myRoleIds?: string[];
  names: MentionNames;
  consecutive: boolean;
  isNew: boolean;
  onOpenUserProfile?: (userId: string) => void;
}) {
  const reduce = useReducedMotion();
  const enter = {
    initial: isNew ? (reduce ? { opacity: 0 } : { opacity: 0, y: distances.rise }) : false,
    animate: { opacity: 1, y: 0 },
    transition: reduce ? transitions.reduced : transitions.base,
  } as const;

  if (msg.type === 'deleted') {
    return (
      <motion.li className={`${styles.message} ${styles.compact}`} {...enter}>
        <span className={styles.gutter} />
        <p className={styles.deleted}>/ este mensaje fue eliminado</p>
      </motion.li>
    );
  }

  if (msg.type === 'system') {
    return (
      <motion.li className={`${styles.message} ${styles.compact}`} {...enter}>
        <span className={styles.gutter} />
        <p className={styles.system}>
          •{msg.content} <time className={styles.time}>{formatMessageTime(msg.timestamp)}</time>
        </p>
      </motion.li>
    );
  }

  const author = msg.author || users[msg.authorId] || { id: msg.authorId, ...UNKNOWN_USER };
  const isAuthor = msg.authorId === (currentUserId || '');
  // Lo que dice Chat-Engine que notificó: un @everyone sin permiso no resalta
  const mentionsMe = !isAuthor && mentionsUser(msg.mentions, currentUserId ?? '', myRoleIds);
  const isEditing = chat.editingMessageId === msg.id;
  const isReplying = chat.replyingTo?.id === msg.id;
  const menuOpen = chat.activeContextMenuMessageId === msg.id;
  const pickerOpen = chat.reactionPickerMessageId === msg.id;
  const openProfile = () => onOpenUserProfile?.(author.id);

  return (
    <motion.li
      className={[
        styles.message,
        consecutive ? styles.compact : '',
        mentionsMe ? styles.mentioned : '',
        isReplying ? styles.replying : '',
        menuOpen || pickerOpen ? styles.toolsOpen : '',
      ].join(' ')}
      {...enter}
    >
      <span className={styles.gutter}>
        {consecutive ? (
          <time className={styles.gutterTime}>{formatMessageHour(msg.timestamp)}</time>
        ) : (
          <button type="button" className={styles.avatarButton} onClick={openProfile} aria-label={`Ver perfil de ${author.displayName}`}>
            <SquareAvatar user={author} size="md" />
          </button>
        )}
      </span>

      <div className={styles.body}>
        {msg.replyTo && (
          <p className={styles.reply}>
            <span className={styles.replyLine} aria-hidden="true" />
            <span className={styles.replyText}>
              @{authorName(msg.replyTo, users)} {mentionsToText(msg.replyTo.content, names)}
            </span>
          </p>
        )}

        {!consecutive && (
          <p className={styles.meta}>
            <button type="button" className={styles.author} onClick={openProfile}>
              {author.displayName}
            </button>{' '}
            <time className={styles.time} dateTime={msg.timestamp}>
              {formatMessageTime(msg.timestamp)}
            </time>
            {msg.isPinned && <span className={styles.time}> · fijado</span>}
          </p>
        )}

        {isEditing ? (
          <EditBox chat={chat} messageId={msg.id} />
        ) : (
          <p className={styles.content}>
            <FormattedContent
              content={msg.content}
              mentions={msg.mentions}
              users={users}
              names={names}
              onOpenUserProfile={onOpenUserProfile}
            />
            {msg.editedTimestamp && <span className={styles.edited}> (editado)</span>}
          </p>
        )}

        {msg.attachments?.map((att) => {
          const isImage =
            att.type?.startsWith('image/') ||
            att.contentType?.startsWith('image/') ||
            /\.(jpe?g|png|webp|gif)$/i.test(att.name || att.url);
          if (isImage && att.url) {
            return (
              <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className={styles.image}>
                <img src={att.url} alt={att.name} loading="lazy" />
              </a>
            );
          }
          return (
            <p key={att.id} className={styles.file}>
              <span className={styles.fileName}>{att.name}</span>
              <span className={styles.time}>{formatAttachmentSize(att.size) || 'archivo'}</span>
              {att.url && (
                <a href={att.url} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                  _descargar
                </a>
              )}
            </p>
          );
        })}

        {msg.reactions && msg.reactions.length > 0 && (
          <div className={styles.reactions}>
            {msg.reactions.map((r) => {
              const active = r.hasReacted || r.users.includes(currentUserId || '');
              return (
                <button
                  key={r.emoji}
                  type="button"
                  className={`${styles.reaction} ${active ? styles.reactionActive : ''}`}
                  onClick={() => chat.handleToggleReaction(msg.id, r.emoji)}
                  aria-pressed={active}
                  aria-label={`${r.emoji} ${r.count}`}
                >
                  <span aria-hidden="true">{r.emoji}</span> {r.count}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Acciones al pasar el mouse o con foco dentro del mensaje */}
      {!isEditing && (
        <div className={styles.tools}>
          {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={styles.toolEmoji}
              onClick={() => chat.handleToggleReaction(msg.id, emoji)}
              aria-label={`Reaccionar con ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <ActionLink onPress={() => chat.setReactionPickerMessageId(pickerOpen ? null : msg.id)} aria-expanded={pickerOpen}>
            reaccionar
          </ActionLink>
          <ActionLink onPress={() => chat.setReplyingTo(msg)}>responder</ActionLink>
          {isAuthor && <ActionLink onPress={() => chat.handleStartEdit(msg)}>editar</ActionLink>}
          <ActionLink onPress={() => chat.setActiveContextMenuMessageId(menuOpen ? null : msg.id)} aria-expanded={menuOpen}>
            más
          </ActionLink>
        </div>
      )}

      {pickerOpen && (
        <Popover className={styles.messagePopover} label="Reacciones" onClose={() => chat.setReactionPickerMessageId(null)}>
          <EmojiGrid onPick={(emoji) => chat.handleToggleReaction(msg.id, emoji)} />
        </Popover>
      )}

      {menuOpen && (
        <Popover className={styles.messagePopover} label="Más acciones" onClose={() => chat.setActiveContextMenuMessageId(null)}>
          <ul className={styles.menu}>
            <li>
              <button type="button" onClick={() => chat.handleCopyText(mentionsToText(msg.content, names), msg.id)}>
                {chat.copiedMessageId === msg.id ? 'copiado/' : 'copiar texto'}
              </button>
            </li>
            <li>
              <button type="button" onClick={() => chat.handleTogglePin(msg)}>
                {msg.isPinned ? 'desfijar mensaje' : 'fijar mensaje'}
              </button>
            </li>
            <li>
              <button type="button" onClick={() => chat.handleDeleteMessage(msg.id)}>
                eliminar mensaje
              </button>
            </li>
          </ul>
        </Popover>
      )}
    </motion.li>
  );
}

/**
 * Menciones, negritas (**texto**) y enlaces. Las menciones salen de los tokens (`<@id>`, `<@&rol>`,
 * `@everyone`); @everyone y los roles solo se resaltan si notificaron (`mentions`), si no son texto.
 */
function FormattedContent({
  content,
  mentions,
  users,
  names,
  onOpenUserProfile,
}: {
  content: string;
  mentions?: MessageMentions;
  users: Record<string, User>;
  names: MentionNames;
  onOpenUserProfile?: (userId: string) => void;
}) {
  return (
    <>
      {splitMentions(sanitizeText(content), mentions).map((segment, index) => {
        if (segment.type === 'text') return <InlineText key={index} text={segment.text} />;
        if (segment.type === 'user') {
          return users[segment.id] ? (
            <button key={index} type="button" className={styles.mention} onClick={() => onOpenUserProfile?.(segment.id)}>
              @{names.user(segment.id)}
            </button>
          ) : (
            <span key={index} className={styles.mention}>
              @{names.user(segment.id)}
            </span>
          );
        }
        const label = segment.type === 'role' ? `@${names.role(segment.id)}` : '@everyone';
        return segment.active ? (
          <span key={index} className={styles.mention}>
            {label}
          </span>
        ) : (
          <Fragment key={index}>{label}</Fragment>
        );
      })}
    </>
  );
}

/** Negritas (**texto**) y enlaces. */
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
        if (/^https?:\/\//.test(part)) {
          return (
            <a key={index} href={part} target="_blank" rel="noopener noreferrer" className={styles.link}>
              {part}
            </a>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

function EditBox({ chat, messageId }: { chat: ChatViewState; messageId: string }) {
  return (
    <div className={styles.edit}>
      <input
        className={styles.editInput}
        aria-label="Editar mensaje"
        value={chat.editContent}
        onChange={(e) => chat.setEditContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') chat.handleSaveEdit(messageId);
          if (e.key === 'Escape') chat.setEditingMessageId(null);
        }}
        autoFocus
      />
      <p className={styles.editHint}>
        escape para <ActionLink onPress={() => chat.setEditingMessageId(null)}>cancelar</ActionLink> · enter para{' '}
        <ActionLink onPress={() => chat.handleSaveEdit(messageId)}>guardar</ActionLink>
      </p>
    </div>
  );
}

function PinnedPanel({ chat, users, names }: { chat: ChatViewState; users: Record<string, User>; names: MentionNames }) {
  return (
    <Popover className={styles.pinned} label="Mensajes fijados" onClose={() => chat.setIsPinnedPanelOpen(false)}>
      <p className={styles.popoverTitle}>Mensajes fijados /</p>
      {chat.pinnedMessages.length === 0 ? (
        <p className={styles.popoverEmpty}>/ todavía no hay mensajes fijados en esta conversación.</p>
      ) : (
        <ul className={styles.pinnedList}>
          {chat.pinnedMessages.map((msg) => (
            <li key={msg.id}>
              <p className={styles.meta}>
                <strong>{(msg.author || users[msg.authorId])?.displayName || 'Usuario'}</strong>{' '}
                <span className={styles.time}>{formatMessageTime(msg.timestamp)}</span>
              </p>
              <p className={styles.pinnedText}>{mentionsToText(msg.content, names)}</p>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}

// ==========================================
// Barra de escritura
// ==========================================

/** Nombre del autor: el del mensaje o, si no viene (el backend manda solo authorId), el del directorio. */
const authorName = (msg: Message, users: Record<string, User>) =>
  (msg.author || users[msg.authorId])?.displayName || 'usuario';

function Composer({ chat, users, writeBlock }: { chat: ChatViewState; users: Record<string, User>; writeBlock: string | null }) {
  const placeholder = chat.isDirectMessage ? `Enviar mensaje a @${chat.chatTitle}` : `Enviar mensaje a ${chat.chatTitle}`;
  const canSend = Boolean(chat.inputText.trim() || chat.attachment) && !chat.isUploading;

  // Silenciado, sin permiso o fuera del servidor: en lugar de la barra, solo el aviso. Vuelve cuando el chat
  // avisa que puede escribir (vence o se levanta el mute)
  if (writeBlock !== null) {
    return (
      <div className={styles.composer}>
        <p className={`${styles.composerRow} ${styles.composerLocked}`} role="status">
          {writeBlock}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.composer}>
      {chat.replyingTo && (
        <p className={styles.composerNote}>
          respondiendo a <strong>@{authorName(chat.replyingTo, users)}</strong>{' '}
          <ActionLink onPress={() => chat.setReplyingTo(null)}>cancelar</ActionLink>
        </p>
      )}
      {chat.attachment && (
        <p className={styles.composerNote}>
          adjunto: <strong>{chat.attachment.name}</strong>{' '}
          {chat.attachment.size
            ? `(${typeof chat.attachment.size === 'number' ? `${(chat.attachment.size / 1024).toFixed(1)} KB` : chat.attachment.size})`
            : ''}{' '}
          <ActionLink onPress={chat.handleRemoveAttachment}>quitar</ActionLink>
        </p>
      )}

      {chat.mentionCandidates.length > 0 && (
        <div
          id="mention-candidates"
          className={styles.composerPopover}
          role="listbox"
          aria-label={`Menciones que coinciden con @${chat.mentionQuery}`}
        >
          <p className={styles.popoverTitle}>Mencionar @{chat.mentionQuery} /</p>
          {chat.mentionCandidates.map((candidate, index) => (
            <button
              key={candidate.key}
              id={`mention-${index}`}
              type="button"
              role="option"
              aria-selected={index === chat.activeMentionIndex}
              className={styles.mentionOption}
              // mousedown: que el input no pierda el foco antes de elegir
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => chat.handleSelectMention(candidate)}
            >
              {candidate.kind === 'user' && <SquareAvatar user={candidate.user} size="sm" />}
              <strong>@{candidate.label}</strong>
              <span className={styles.time}>
                {candidate.kind === 'user'
                  ? candidate.user.displayName
                  : candidate.kind === 'role'
                    ? 'rol'
                    : 'todos los que ven el canal'}
              </span>
            </button>
          ))}
        </div>
      )}

      {chat.isEmojiPickerOpen && (
        <Popover className={styles.composerPopover} label="Emojis" onClose={() => chat.setIsEmojiPickerOpen(false)}>
          <EmojiGrid
            onPick={(emoji) => {
              chat.setInputText((prev) => prev + emoji);
              chat.setIsEmojiPickerOpen(false);
              chat.composerInputRef.current?.focus();
            }}
          />
        </Popover>
      )}

      <div className={styles.composerRow}>
        {chat.canAttach && (
          <>
            <button
              type="button"
              className={styles.composerIcon}
              onClick={chat.handleAttachClick}
              aria-label="Adjuntar archivo"
              title="Adjuntar archivo"
              disabled={chat.isUploading}
            >
              <Paperclip size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <input
              type="file"
              ref={chat.fileInputRef}
              style={{ display: 'none' }}
              accept={ATTACHMENT_ACCEPT}
              onChange={chat.handleFileChange}
            />
          </>
        )}
        <input
          ref={chat.composerInputRef}
          className={styles.composerInput}
          placeholder={placeholder}
          aria-label={placeholder}
          value={chat.inputText}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={chat.mentionCandidates.length > 0}
          aria-controls={chat.mentionCandidates.length > 0 ? 'mention-candidates' : undefined}
          aria-activedescendant={chat.mentionCandidates.length > 0 ? `mention-${chat.activeMentionIndex}` : undefined}
          onChange={chat.handleInputChange}
          // Enter no envía mientras no se pueda escribir (el botón ya está deshabilitado)
          onKeyDown={chat.handleKeyDown}
        />
        <button
          type="button"
          className={styles.composerIcon}
          onClick={() => chat.setIsEmojiPickerOpen((v) => !v)}
          aria-label="Emojis"
          aria-expanded={chat.isEmojiPickerOpen}
          title="Emojis"
        >
          <Smile size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button type="button" className={styles.send} onClick={chat.handleSend} disabled={!canSend}>
          {chat.isUploading ? 'subiendo...' : 'enviar /'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// Piezas compartidas
// ==========================================

function EmojiGrid({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className={styles.emojiGrid}>
      {POPULAR_EMOJIS.map((emoji) => (
        <button key={emoji} type="button" className={styles.emoji} onClick={() => onPick(emoji)} aria-label={emoji}>
          {emoji}
        </button>
      ))}
    </div>
  );
}

/** Panel flotante de línea fina; se cierra con Escape. */
function Popover({ children, className, label, onClose }: { children: ReactNode; className: string; label: string; onClose: () => void }) {
  return (
    <div
      className={`${styles.popover} ${className}`}
      role="dialog"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {children}
    </div>
  );
}
