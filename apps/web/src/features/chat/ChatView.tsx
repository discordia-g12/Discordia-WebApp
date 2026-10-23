import { Fragment, useRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Paperclip, Smile } from 'lucide-react';
import { distances } from '@discordia/tokens';
import type { Message, User } from '../../types';
import { ActionLink, Skeleton, SquareAvatar, transitions } from '../../ui';
import type { ChatViewProps } from './legacy/LegacyChatView';
import { POPULAR_EMOJIS, QUICK_EMOJIS, sanitizeText, useChatViewState, type ChatViewState } from './useChatViewState';
import styles from './ChatView.module.css';

export type { ChatViewProps };

const UNKNOWN_USER = { username: 'desconocido', displayName: 'Desconocido', status: 'offline' } as const;

const timeFormat = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const dayFormat = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
const hourFormat = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const validDate = (iso: string) => {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
};

/** "20/10/25, 13:25" (PDF, pág. 7). */
function formatTimestamp(iso: string): string {
  const date = validDate(iso);
  return date ? timeFormat.format(date) : '';
}

/** Separador de día: "hoy", "ayer" o "21 de octubre de 2025". */
function formatDay(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'ayer';
  return dayFormat.format(date);
}

/**
 * Ids de los mensajes que ya estaban al abrir la conversación: esos no se animan. Los que llegan
 * después (enviados o recibidos por el WebSocket) entran subiendo.
 */
function useHistoryIds(conversationKey: string, messages: Message[], isLoading: boolean) {
  const state = useRef<{ key: string | null; ready: boolean; ids: Set<string> }>({ key: null, ready: false, ids: new Set() });
  if (state.current.key !== conversationKey) state.current = { key: conversationKey, ready: false, ids: new Set() };
  if (!state.current.ready && !isLoading) {
    messages.forEach((m) => state.current.ids.add(m.id));
    state.current.ready = true;
  }
  return state.current.ids;
}

/**
 * Chat del rediseño (PDF, págs. 7 y 9), para canales y mensajes directos. Encabezado con el nombre y
 * enlaces de texto; mensajes con avatar cuadrado, metadato chico y texto grande, separados por día;
 * respuestas con una línea fina; reacciones y adjuntos sin bordes redondeados; barra de escritura de una
 * línea. La lógica es la de useChatViewState (compartida con legacy/LegacyChatView).
 */
export function ChatView(props: ChatViewProps) {
  const {
    channel,
    directMessage,
    messages,
    isLoading = false,
    currentUserId,
    users = {},
    onOpenUserProfile,
    onToggleMemberList,
    isMemberListOpen = true,
    onStartVoiceCall,
    onStartVideoCall,
  } = props;
  const chat = useChatViewState({ ...props, messages });
  const history = useHistoryIds(channel?.id ?? directMessage?.id ?? 'chat', chat.localMessages, isLoading);
  const currentUsername = users[currentUserId ?? '']?.username;

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
              {directMessage?.recipientId && (
                <HeaderLink onPress={() => onOpenUserProfile?.(directMessage.recipientId)}>perfil</HeaderLink>
              )}
              <HeaderLink onPress={onStartVoiceCall}>llamar</HeaderLink>
              <HeaderLink onPress={onStartVideoCall}>videollamada</HeaderLink>
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

      {chat.isPinnedPanelOpen && <PinnedPanel chat={chat} users={users} />}

      <div className={styles.scroll} role="log" aria-label={`Mensajes de ${chat.chatTitle}`}>
        <div className={styles.welcome}>
          <p className={styles.welcomeTitle}>{chat.isDirectMessage ? chat.chatTitle : `•${chat.chatTitle}`}</p>
          <p className={styles.welcomeText}>
            /{' '}
            {chat.isDirectMessage
              ? `este es el comienzo de tu conversación con ${chat.chatTitle}.`
              : `este es el comienzo del canal •${chat.chatTitle}.`}
          </p>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            <Skeleton lines={6} label="Cargando mensajes" />
          </div>
        ) : (
          <ol className={styles.messages}>
            {chat.localMessages.map((msg, index) => {
              const prev = index > 0 ? chat.localMessages[index - 1] : null;
              const date = validDate(msg.timestamp);
              const prevDate = prev ? validDate(prev.timestamp) : null;
              const newDay = date && (!prevDate || prevDate.toDateString() !== date.toDateString());
              const consecutive =
                !newDay &&
                prev !== null &&
                prev.authorId === msg.authorId &&
                prev.type !== 'system' &&
                msg.type !== 'system' &&
                Math.abs(new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime()) < 5 * 60 * 1000;

              return (
                <Fragment key={msg.id}>
                  {newDay && date && (
                    <li className={styles.day} aria-label={formatDay(date)}>
                      {formatDay(date)}
                    </li>
                  )}
                  <MessageRow
                    msg={msg}
                    chat={chat}
                    users={users}
                    currentUserId={currentUserId}
                    currentUsername={currentUsername}
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

      <Composer chat={chat} users={users} />
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
  currentUsername,
  consecutive,
  isNew,
  onOpenUserProfile,
}: {
  msg: Message;
  chat: ChatViewState;
  users: Record<string, User>;
  currentUserId?: string;
  currentUsername?: string;
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
          •{msg.content} <time className={styles.time}>{formatTimestamp(msg.timestamp)}</time>
        </p>
      </motion.li>
    );
  }

  const author = msg.author || users[msg.authorId] || { id: msg.authorId, ...UNKNOWN_USER };
  const isAuthor = msg.authorId === (currentUserId || '');
  const mentionsMe = Boolean(currentUsername && msg.content.includes(`@${currentUsername}`));
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
          <time className={styles.gutterTime}>{validDate(msg.timestamp) ? hourFormat.format(new Date(msg.timestamp)) : ''}</time>
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
              @{authorName(msg.replyTo, users)} {msg.replyTo.content}
            </span>
          </p>
        )}

        {!consecutive && (
          <p className={styles.meta}>
            <button type="button" className={styles.author} onClick={openProfile}>
              {author.displayName}
            </button>{' '}
            <time className={styles.time} dateTime={msg.timestamp}>
              {formatTimestamp(msg.timestamp)}
            </time>
            {msg.isPinned && <span className={styles.time}> · fijado</span>}
          </p>
        )}

        {isEditing ? (
          <EditBox chat={chat} messageId={msg.id} />
        ) : (
          <p className={styles.content}>
            <FormattedContent content={msg.content} users={users} onOpenUserProfile={onOpenUserProfile} />
            {msg.editedTimestamp && <span className={styles.edited}> (editado)</span>}
          </p>
        )}

        {msg.attachments?.map((att) => {
          const isImage = att.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(att.url);
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
              <span className={styles.time}>{att.size ? String(att.size) : 'tamaño desconocido'}</span>
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
              <button type="button" onClick={() => chat.handleCopyText(msg.content, msg.id)}>
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

/** Menciones (@usuario), negritas (**texto**) y enlaces. */
function FormattedContent({
  content,
  users,
  onOpenUserProfile,
}: {
  content: string;
  users: Record<string, User>;
  onOpenUserProfile?: (userId: string) => void;
}) {
  const parts = sanitizeText(content).split(/(\*\*[^*]+\*\*|@[\w\d_-]+|https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('@')) {
          const candidate = Object.values(users).find((u) => u.username.toLowerCase() === part.slice(1).toLowerCase());
          return candidate ? (
            <button key={index} type="button" className={styles.mention} onClick={() => onOpenUserProfile?.(candidate.id)}>
              {part}
            </button>
          ) : (
            <span key={index} className={styles.mention}>
              {part}
            </span>
          );
        }
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

function PinnedPanel({ chat, users }: { chat: ChatViewState; users: Record<string, User> }) {
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
                <span className={styles.time}>{formatTimestamp(msg.timestamp)}</span>
              </p>
              <p className={styles.pinnedText}>{msg.content}</p>
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

function Composer({ chat, users }: { chat: ChatViewState; users: Record<string, User> }) {
  const placeholder = chat.isDirectMessage ? `Enviar mensaje a @${chat.chatTitle}` : `Enviar mensaje a ${chat.chatTitle}`;
  const canSend = Boolean(chat.inputText.trim() || chat.attachment);

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
          adjunto: <strong>{chat.attachment.name}</strong> {chat.attachment.size ? `(${chat.attachment.size})` : ''}{' '}
          <ActionLink onPress={() => chat.setAttachment(null)}>quitar</ActionLink>
        </p>
      )}

      {chat.mentionCandidates.length > 0 && (
        <div className={styles.composerPopover} role="listbox" aria-label={`Miembros que coinciden con @${chat.mentionQuery}`}>
          <p className={styles.popoverTitle}>Miembros @{chat.mentionQuery} /</p>
          {chat.mentionCandidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="option"
              aria-selected={false}
              className={styles.mentionOption}
              onClick={() => chat.handleSelectMention(candidate)}
            >
              <SquareAvatar user={candidate} size="sm" />
              <strong>{candidate.displayName}</strong>
              <span className={styles.time}>@{candidate.username}</span>
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
        <button type="button" className={styles.composerIcon} onClick={chat.handleAttachMock} aria-label="Adjuntar archivo" title="Adjuntar archivo">
          <Paperclip size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <input
          ref={chat.composerInputRef}
          className={styles.composerInput}
          placeholder={placeholder}
          aria-label={placeholder}
          value={chat.inputText}
          onChange={chat.handleInputChange}
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
          enviar /
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
