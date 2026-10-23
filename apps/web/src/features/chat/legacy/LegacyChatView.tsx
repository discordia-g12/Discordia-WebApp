import React from 'react';
import {
  Hash,
  Volume2,
  Bell,
  BellOff,
  Pin,
  Users,
  Search,
  Send,
  Smile,
  Paperclip,
  X,
  CornerUpLeft,
  Pencil,
  Trash2,
  MoreHorizontal,
  FileText,
  Copy,
  Flag,
  Check,
  Plus,
  Phone,
  Video,
} from 'lucide-react';
import { Channel, DirectMessage, Message, User, MessageAttachment } from '../../../types';
import { POPULAR_EMOJIS, QUICK_EMOJIS, sanitizeText, useChatViewState } from '../useChatViewState';

import { Avatar } from '../../../ui/legacy/Avatar';
import styles from './LegacyChatView.module.css';


/**
 * Propiedades de configuración para el componente ChatView.
 */
export interface ChatViewProps {
  /** Canal activo si la vista corresponde a un servidor. */
  channel?: Channel | null;
  /** Conversación directa activa si la vista corresponde a un DM. */
  directMessage?: DirectMessage | null;
  /** Lista opcional de mensajes. Si no se provee, usa los datos mock. */
  messages?: Message[];
  /** ID del usuario actualmente autenticado. */
  currentUserId?: string;
  /** Directorio de usuarios para resolver autores y menciones. */
  users?: Record<string, User>;
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
  /** Callback para iniciar llamada de voz directa. */
  onStartVoiceCall?: () => void;
  /** Callback para iniciar videollamada directa. */
  onStartVideoCall?: () => void;
}

/**
 * Formatea una marca de tiempo ISO a representación legible según cercanía temporal.
 */
function formatMessageTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isSameDay) {
    return `Today at ${timeStr}`;
  }
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

/**
 * Obtiene solo la hora formateada para mensajes agrupados en modo compacto.
 */
function formatCompactTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Componente principal de conversación en canales y mensajes directos.
 */
export const LegacyChatView: React.FC<ChatViewProps> = ({
  channel,
  directMessage,
  messages: externalMessages,
  isLoading = false,
  currentUserId,
  users = {},
  onSendMessage,
  onToggleReaction,
  onDeleteMessage,
  onEditMessage,
  onPinMessage,
  onOpenUserProfile,
  onToggleMemberList,
  isMemberListOpen = true,
  onStartVoiceCall,
  onStartVideoCall,
}) => {
  const {
    localMessages,
    chatTitle,
    chatTopic,
    isDirectMessage,
    inputText,
    setInputText,
    replyingTo,
    setReplyingTo,
    editingMessageId,
    setEditingMessageId,
    editContent,
    setEditContent,
    attachment,
    setAttachment,
    isEmojiPickerOpen,
    setIsEmojiPickerOpen,
    isPinnedPanelOpen,
    setIsPinnedPanelOpen,
    isNotificationsMuted,
    setIsNotificationsMuted,
    activeContextMenuMessageId,
    setActiveContextMenuMessageId,
    reactionPickerMessageId,
    setReactionPickerMessageId,
    copiedMessageId,
    mentionQuery,
    mentionCandidates,
    messagesEndRef,
    composerInputRef,
    pinnedMessages,
    handleInputChange,
    handleSelectMention,
    handleSend,
    handleKeyDown,
    handleToggleReaction,
    handleStartEdit,
    handleSaveEdit,
    handleDeleteMessage,
    handleTogglePin,
    handleCopyText,
    handleAttachMock,
  } = useChatViewState({
    channel,
    directMessage,
    messages: externalMessages,
    currentUserId,
    users,
    onSendMessage,
    onToggleReaction,
    onDeleteMessage,
    onEditMessage,
    onPinMessage,
  });

  // Renderizado con formato: menciones, negritas y enlaces
  const renderFormattedContent = (content: string) => {
    const sanitized = sanitizeText(content);
    const parts = sanitized.split(/(\*\*[^*]+\*\*|@[\w\d_-]+|https?:\/\/[^\s]+)/g);

    return parts.map((part, index) => {
      if (!part) return null;
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className={styles.formattedContentStrong}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('@')) {
        const username = part.slice(1);
        const candidate = Object.values(users).find(
          (u) => u.username.toLowerCase() === username.toLowerCase()
        );
        return (
          <span
            key={index}
            className="mention-pill"
            onClick={() => candidate && onOpenUserProfile?.(candidate.id)}
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.formattedContentA}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="chat-container">
      {/* ==========================================================================
          1. CABECERA DEL CANAL / DM
          ========================================================================== */}
      <header className="chat-header">
        <div className={styles.div}>
          {isDirectMessage ? (
            <div className={styles.div2}>
              <Avatar user={directMessage?.recipient || { id: "unknown", username: chatTitle, displayName: chatTitle } as any} size={28} />
              <span
                className={`status-dot ${directMessage?.recipient?.status || 'offline'}`}
                style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8 }}
              />
            </div>
          ) : channel?.type === 'voice' ? (
            <Volume2 size={24} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          ) : (
            <Hash size={24} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          )}

          <h2 className={styles.h2}>
            {chatTitle}
          </h2>

          <div className={styles.div3} />

          <p className={styles.p}>
            {chatTopic}
          </p>
        </div>

        {/* Acciones de la Cabecera */}
        <div className={styles.accionesCabecera}>
          {isDirectMessage && (
            <>
              <button
                className="btn-icon"
                title="Llamada de voz"
                onClick={onStartVoiceCall}
              >
                <Phone size={20} />
              </button>
              <button
                className="btn-icon"
                title="Videollamada"
                onClick={onStartVideoCall}
              >
                <Video size={20} />
              </button>
            </>
          )}

          <button
            className="btn-icon"
            title={isNotificationsMuted ? 'Activar notificaciones' : 'Silenciar notificaciones'}
            onClick={() => setIsNotificationsMuted((v) => !v)}
            style={{ color: isNotificationsMuted ? 'var(--danger)' : undefined }}
          >
            {isNotificationsMuted ? <BellOff size={20} /> : <Bell size={20} />}
          </button>

          <button
            className="btn-icon"
            title="Mensajes fijados"
            onClick={() => setIsPinnedPanelOpen((v) => !v)}
            style={{
              backgroundColor: isPinnedPanelOpen ? 'var(--bg-modifier-selected)' : undefined,
              color: pinnedMessages.length > 0 ? 'var(--status-idle)' : undefined,
            }}
          >
            <Pin size={20} />
          </button>

          {!isDirectMessage && (
            <button
              className="btn-icon"
              title="Lista de miembros"
              onClick={onToggleMemberList}
              style={{
                backgroundColor: isMemberListOpen ? 'var(--bg-modifier-selected)' : undefined,
                color: isMemberListOpen ? 'var(--interactive-active)' : undefined,
              }}
            >
              <Users size={20} />
            </button>
          )}

          <div className={styles.accionesCabeceraDiv}>
            <input
              type="text"
              placeholder="Search"
              className={styles.search}
            />
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </header>

      {/* ==========================================================================
          MODAL / DROPDOWN DE MENSAJES FIJADOS
          ========================================================================== */}
      {isPinnedPanelOpen && (
        <div className={styles.div4}>
          <div className={styles.div5}>
            <div className={styles.div6}>
              <Pin size={16} style={{ color: 'var(--status-idle)' }} />
              <span className={styles.span}>
                Pinned Messages ({pinnedMessages.length})
              </span>
            </div>
            <button
              className="btn-icon"
              style={{ width: 24, height: 24 }}
              onClick={() => setIsPinnedPanelOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
          <div className={styles.div7}>
            {pinnedMessages.length === 0 ? (
              <p className={styles.p2}>
                No pinned messages in this channel yet.
              </p>
            ) : (
              pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={styles.div8}
                >
                  <div className={styles.div9}>
                    <span className={styles.span2}>
                      {msg.author?.displayName || 'User'}
                    </span>
                    <span className={styles.span3}>
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className={styles.p3}>{msg.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==========================================================================
          2. HILO DE MENSAJES
          ========================================================================== */}
      <div className={styles.div10}>
        {/* Mensaje de Bienvenida del Canal */}
        <div className={styles.mensajeBienvenidaCanal}>
          <div className={styles.mensajeBienvenidaCanalDiv}>
            {isDirectMessage ? (
              <span className={styles.mensajeBienvenidaCanalDivSpan}>👋</span>
            ) : (
              <Hash size={44} style={{ color: 'var(--header-primary)' }} />
            )}
          </div>
          <h1 className={styles.mensajeBienvenidaCanalH1}>
            Welcome to {isDirectMessage ? chatTitle : `#${chatTitle}`}!
          </h1>
          <p className={styles.mensajeBienvenidaCanalP}>
            {isDirectMessage
              ? `This is the start of your direct message history with ${chatTitle}.`
              : `This is the start of the #${chatTitle} channel.`}
          </p>
        </div>

        <div className="message-divider">
          <span>Today</span>
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className={styles.div11}>
            <style>{`
              @keyframes pulse {
                0% { opacity: 0.4; }
                50% { opacity: 0.8; }
                100% { opacity: 0.4; }
              }
              .skeleton {
                background-color: var(--bg-modifier-selected);
                animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              }
            `}</style>
            {[70, 45, 85, 55].map((width, idx) => (
              <div key={idx} className="message-row" style={{ marginTop: 16 }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', marginRight: 16, flexShrink: 0 }} />
                <div className="message-content-wrapper" style={{ width: '100%', pointerEvents: 'none' }}>
                  <div className="message-header" style={{ marginBottom: 8, marginTop: 4 }}>
                    <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 4 }} />
                  </div>
                  <div className="skeleton" style={{ width: `${width}%`, height: 16, borderRadius: 4, marginTop: 6 }} />
                  {idx % 2 !== 0 && (
                    <div className="skeleton" style={{ width: `${width - 15}%`, height: 16, borderRadius: 4, marginTop: 6 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Lista de Mensajes */}
            {localMessages.map((msg, index) => {
          const prevMsg = index > 0 ? localMessages[index - 1] : null;
          const isSameAuthor = prevMsg && prevMsg.authorId === msg.authorId;
          const timeDiff = prevMsg
            ? Math.abs(new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime())
            : Infinity;
          // Agrupación visual: mismo autor en menos de 5 minutos
          const isConsecutive = isSameAuthor && timeDiff < 5 * 60 * 1000 && msg.type !== 'system';

          // Mensaje eliminado
          if (msg.type === 'deleted') {
            return (
              <div key={msg.id} className="message-row" style={{ opacity: 0.6, fontStyle: 'italic' }}>
                <div className={styles.div12} />
                <div className="message-content-wrapper">
                  <span className={styles.thisMessageWasDeleted}>
                    [This message was deleted]
                  </span>
                </div>
              </div>
            );
          }

          // Mensaje del sistema (ej. bienvenida o unión)
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="message-row system">
                <span className={styles.span4}>✨</span>
                <span>{msg.content}</span>
                <span className="message-timestamp" style={{ marginLeft: 8 }}>
                  {formatCompactTime(msg.timestamp)}
                </span>
              </div>
            );
          }

          const isAuthor = msg.authorId === (currentUserId || '');
          const authorUser = msg.author || users[msg.authorId] || { id: msg.authorId, username: 'Desconocido', displayName: 'Desconocido', avatar: '', status: 'offline' };
          const isReplying = replyingTo?.id === msg.id;

          return (
            <div
              key={msg.id}
              className={`message-row ${msg.content.includes('@' + (users[currentUserId || '']?.username || '')) ? 'mentioned' : ''}`}
              style={{
                marginTop: isConsecutive ? 0 : 12,
                backgroundColor: isReplying ? 'rgba(88, 101, 242, 0.08)' : undefined,
              }}
            >
              {/* Barra flotante de acciones en hover */}
              <div className="message-actions">
                {/* Reacciones rápidas */}
                {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                  <button
                    key={emoji}
                    className="message-action-btn"
                    title={`Reaccionar ${emoji}`}
                    onClick={() => handleToggleReaction(msg.id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}

                {/* Más reacciones */}
                <button
                  className="message-action-btn"
                  title="Añadir reacción"
                  onClick={() =>
                    setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id)
                  }
                >
                  <Smile size={16} />
                </button>

                {/* Responder */}
                <button
                  className="message-action-btn"
                  title="Responder"
                  onClick={() => setReplyingTo(msg)}
                >
                  <CornerUpLeft size={16} />
                </button>

                {/* Editar (si es autor) */}
                {isAuthor && (
                  <button
                    className="message-action-btn"
                    title="Editar mensaje"
                    onClick={() => handleStartEdit(msg)}
                  >
                    <Pencil size={16} />
                  </button>
                )}

                {/* Más opciones context menu */}
                <button
                  className="message-action-btn"
                  title="Más opciones"
                  onClick={() =>
                    setActiveContextMenuMessageId(
                      activeContextMenuMessageId === msg.id ? null : msg.id
                    )
                  }
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              {/* Popover de selector de reacciones */}
              {reactionPickerMessageId === msg.id && (
                <div
                  className="context-menu"
                  style={{
                    position: 'absolute',
                    top: -48,
                    right: 60,
                    display: 'flex',
                    flexWrap: 'wrap',
                    maxWidth: 240,
                    gap: 6,
                    padding: 8,
                    zIndex: 120,
                  }}
                >
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      className="emoji-picker-btn"
                      onClick={() => handleToggleReaction(msg.id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Context menu desplegable */}
              {activeContextMenuMessageId === msg.id && (
                <div
                  className="context-menu"
                  style={{ top: 20, right: 16 }}
                  onMouseLeave={() => setActiveContextMenuMessageId(null)}
                >
                  <div
                    className="context-menu-item"
                    onClick={() => handleCopyText(msg.content, msg.id)}
                  >
                    <span>Copiar texto</span>
                    {copiedMessageId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                  </div>
                  <div className="context-menu-item" onClick={() => handleTogglePin(msg)}>
                    <span>{msg.isPinned ? 'Desfijar mensaje' : 'Fijar mensaje'}</span>
                    <Pin size={14} />
                  </div>
                  <div
                    className="context-menu-item danger"
                    onClick={() => handleDeleteMessage(msg.id)}
                  >
                    <span>Eliminar mensaje</span>
                    <Trash2 size={14} />
                  </div>
                  <div className="context-menu-separator" />
                  <div
                    className="context-menu-item"
                    onClick={() => setActiveContextMenuMessageId(null)}
                  >
                    <span>Reportar mensaje</span>
                    <Flag size={14} />
                  </div>
                </div>
              )}

              {/* Avatar o Timestamp Compacto */}
              {isConsecutive ? (
                <div className={styles.div13}>
                  {formatCompactTime(msg.timestamp)}
                </div>
              ) : (
                <Avatar user={authorUser || { id: "unknown", username: "Desconocido" } as any} size={40} onClick={() => authorUser && onOpenUserProfile && onOpenUserProfile(authorUser.id)} />
              )}

              {/* Contenido del Mensaje */}
              <div className="message-content-wrapper">
                {/* Referencia de Respuesta previa si existe */}
                {msg.replyTo && (
                  <div className={styles.contenidoMensajeDiv}>
                    <CornerUpLeft size={12} />
                    <span className={styles.contenidoMensajeDivSpan}>
                      @{msg.replyTo.author?.displayName || 'User'}
                    </span>
                    <span className={styles.contenidoMensajeDivSpan2}>
                      {msg.replyTo.content}
                    </span>
                  </div>
                )}

                {/* Cabecera del Mensaje (solo en no consecutivos) */}
                {!isConsecutive && (
                  <div className="message-header">
                    <span
                      className="message-author"
                      onClick={() => authorUser && onOpenUserProfile?.(authorUser.id)}
                    >
                      {authorUser?.displayName || 'User'}
                    </span>

                    {authorUser?.isStaff && (
                      <span className="badge badge-brand" style={{ fontSize: 9, padding: '1px 4px' }}>
                        STAFF
                      </span>
                    )}

                    {authorUser?.isPremium && (
                      <span className="badge badge-boost" style={{ fontSize: 9, padding: '1px 4px' }}>
                        NITRO
                      </span>
                    )}

                    <span className="message-timestamp">{formatMessageTime(msg.timestamp)}</span>

                    {msg.isPinned && (
                      <span
                        title="Mensaje fijado"
                        className={styles.mensajeFijado}
                      >
                        <Pin size={12} />
                      </span>
                    )}
                  </div>
                )}

                {/* Editor Inline si está en modo edición */}
                {editingMessageId === msg.id ? (
                  <div className={styles.contenidoMensajeDiv2}>
                    <input
                      type="text"
                      className="discord-input"
                      value={editContent}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditContent(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') handleSaveEdit(msg.id);
                        if (e.key === 'Escape') setEditingMessageId(null);
                      }}
                      autoFocus
                    />
                    <div className={styles.contenidoMensajeDiv2Div}>
                      escape para{' '}
                      <button
                        className="btn-link"
                        style={{ fontSize: 11, color: 'var(--text-link)' }}
                        onClick={() => setEditingMessageId(null)}
                      >
                        cancelar
                      </button>{' '}
                      • enter para{' '}
                      <button
                        className="btn-link"
                        style={{ fontSize: 11, color: 'var(--text-link)' }}
                        onClick={() => handleSaveEdit(msg.id)}
                      >
                        guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="message-content">
                    {renderFormattedContent(msg.content)}
                    {msg.editedTimestamp && (
                      <span className={styles.edited}>
                        (edited)
                      </span>
                    )}
                  </div>
                )}

                {/* Adjuntos: Previsualización de imágenes y archivos */}
                {msg.attachments &&
                  msg.attachments.map((att) => {
                    const isImg =
                      att.type?.startsWith('image/') ||
                      att.url.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                    if (isImg) {
                      return (
                        <div key={att.id} className="message-attachment">
                          <img
                            src={att.url}
                            alt={att.name}
                            loading="lazy"
                            className={styles.contenidoMensajeImg}
                            onClick={() => window.open(att.url, '_blank')}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={att.id} className="file-attachment-card">
                        <div className={styles.contenidoMensajeDiv3}>
                          <FileText size={20} />
                        </div>
                        <div className={styles.contenidoMensajeDiv4}>
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.contenidoMensajeDiv4A}
                          >
                            {att.name}
                          </a>
                          <span className={styles.contenidoMensajeDiv4Span}>
                            {att.size || 'Unknown size'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {/* Reacciones Emoji Interactivas */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="message-reactions">
                    {msg.reactions.map((r, rIdx) => {
                      const active = r.hasReacted || r.users.includes(currentUserId || '');
                      return (
                        <button
                          key={rIdx}
                          className={`message-reaction ${active ? 'active' : ''}`}
                          onClick={() => handleToggleReaction(msg.id, r.emoji)}
                          title={`${r.users.length} personas reaccionaron`}
                        >
                          <span>{r.emoji}</span>
                          <span className={styles.contenidoMensajeSpan}>{r.count}</span>
                        </button>
                      );
                    })}
                    <button
                      className="message-reaction"
                      onClick={() =>
                        setReactionPickerMessageId(
                          reactionPickerMessageId === msg.id ? null : msg.id
                        )
                      }
                      title="Añadir reacción"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ==========================================================================
          3. COMPOSER INFERIOR
          ========================================================================== */}
      <div className={styles.div14}>
        {/* Indicador de Respuesta "Replying to..." */}
        {replyingTo && (
          <div className={styles.div15}>
            <div className={styles.div6}>
              <span>Replying to</span>
              <strong className={styles.strong}>
                @{replyingTo.author?.displayName || 'User'}
              </strong>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className={styles.button}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Previsualización de archivo a adjuntar */}
        {attachment && (
          <div className={styles.div16}>
            <div className={styles.accionesCabecera}>
              <FileText size={16} style={{ color: 'var(--brand)' }} />
              <span className={styles.accionesCabeceraSpan}>{attachment.name}</span>
              <span className={styles.accionesCabeceraSpan2}>({attachment.size})</span>
            </div>
            <button
              onClick={() => setAttachment(null)}
              className={styles.button2}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Popover de Autocompletado de Menciones (@) */}
        {mentionCandidates.length > 0 && (
          <div className={styles.div17}>
            <div className={styles.div18}>
              MEMBERS MATCHING @{mentionQuery}
            </div>
            {mentionCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="mention-candidate-item"
                onClick={() => handleSelectMention(candidate)}
              >
                <Avatar user={candidate} size={24} />
                <span className={styles.span}>
                  {candidate.displayName}
                </span>
                <span className={styles.accionesCabeceraSpan2}>
                  @{candidate.username}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Popover de Emojis */}
        {isEmojiPickerOpen && (
          <div className={styles.div19}>
            <div className={styles.emojis}>
              EMOJIS
            </div>
            <div className={styles.div20}>
              {POPULAR_EMOJIS.map((em) => (
                <button
                  key={em}
                  className="emoji-picker-btn"
                  onClick={() => {
                    setInputText((prev) => prev + em);
                    setIsEmojiPickerOpen(false);
                    composerInputRef.current?.focus();
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div
          className={styles.inputBar} style={{ borderRadius: replyingTo || attachment ? '0 0 8px 8px' : 'var(--radius-md)' }}
        >
          {/* Botón Adjuntar */}
          <button
            className="btn-icon"
            title="Adjuntar archivo"
            onClick={handleAttachMock}
            style={{ flexShrink: 0 }}
          >
            <Paperclip size={20} />
          </button>

          {/* Campo de Texto Principal */}
          <input
            ref={composerInputRef}
            type="text"
            className="discord-input"
            placeholder={isDirectMessage ? `Message @${chatTitle}` : `Message #${chatTitle}`}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: '10px 8px',
            }}
          />

          {/* Botón Selector de Emojis */}
          <button
            className="btn-icon"
            title="Abrir selector de emojis"
            onClick={() => setIsEmojiPickerOpen((v) => !v)}
            style={{
              flexShrink: 0,
              color: isEmojiPickerOpen ? 'var(--status-idle)' : undefined,
            }}
          >
            <Smile size={20} />
          </button>

          {/* Botón Enviar */}
          <button
            className="btn-icon"
            title="Enviar mensaje"
            onClick={handleSend}
            disabled={!inputText.trim() && !attachment}
            style={{
              flexShrink: 0,
              color: inputText.trim() || attachment ? 'var(--brand)' : 'var(--interactive-muted)',
              cursor: inputText.trim() || attachment ? 'pointer' : 'not-allowed',
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
