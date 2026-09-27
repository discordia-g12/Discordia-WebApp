import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { Channel, DirectMessage, Message, User, MessageAttachment, Reaction } from '../types';


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

/** Emojis disponibles para reacciones rápidas y selector. */
const QUICK_EMOJIS = ['❤️', '👍', '😂', '🚀', '🔥', '🎉', '👏', '👀'];
const POPULAR_EMOJIS = [
  '😀', '😂', '😍', '😎', '🥳', '🤔', '🙌', '👍',
  '❤️', '🔥', '✨', '🚀', '💯', '🛡️', '⚡', '☕'
];

/**
 * Limpia caracteres nulos \x00 para evitar fallos de persistencia en PostgreSQL.
 */
function sanitizeText(raw: string): string {
  return raw.replace(/\x00/g, '');
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
export const ChatView: React.FC<ChatViewProps> = ({
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
  // Inicialización de mensajes locales
  const initialList = useMemo(() => {
    if (externalMessages) return externalMessages;
    if (channel) return [];
    return [];
  }, [externalMessages, channel]);

  const [localMessages, setLocalMessages] = useState<Message[]>(initialList);

  useEffect(() => {
    setLocalMessages(initialList);
  }, [initialList]);

  // Estado del composer y acciones
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachment, setAttachment] = useState<MessageAttachment | null>(null);

  // Menús flotantes e interactivos
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isPinnedPanelOpen, setIsPinnedPanelOpen] = useState(false);
  const [isNotificationsMuted, setIsNotificationsMuted] = useState(false);
  const [activeContextMenuMessageId, setActiveContextMenuMessageId] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorIndex, setMentionCursorIndex] = useState<number>(-1);

  // Referencias para scroll y clicks externos
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages.length]);

  // Título e información de cabecera
  const chatTitle = channel ? channel.name : directMessage?.recipient?.displayName || 'Chat';
  const chatTopic = channel?.topic || directMessage?.recipient?.customStatus || 'No topic set.';
  const isDirectMessage = Boolean(directMessage);

  // Filtrado de usuarios para autocompletado de menciones con @
  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();
    return Object.values(users)
      .filter((u) => u.username.toLowerCase().includes(query) || u.displayName.toLowerCase().includes(query))
      .slice(0, 5);
  }, [mentionQuery, users]);

  // Manejo de entrada de texto con detección de '@'
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1 && !textBeforeCursor.slice(atIndex).includes(' ')) {
      const query = textBeforeCursor.slice(atIndex + 1);
      setMentionQuery(query);
      setMentionCursorIndex(atIndex);
    } else {
      setMentionQuery(null);
      setMentionCursorIndex(-1);
    }
  };

  const handleSelectMention = (candidate: User) => {
    if (mentionCursorIndex === -1) return;
    const before = inputText.slice(0, mentionCursorIndex);
    const after = inputText.slice(mentionCursorIndex + (mentionQuery?.length || 0) + 1);
    const completed = `${before}@${candidate.username} ${after}`;
    setInputText(completed);
    setMentionQuery(null);
    setMentionCursorIndex(-1);
    composerInputRef.current?.focus();
  };

  // Envío de mensaje
  const handleSend = () => {
    const sanitized = sanitizeText(inputText.trim());
    if (!sanitized && !attachment) return;

    if (onSendMessage) {
      onSendMessage(sanitized, attachment || undefined, replyingTo?.id);
    } else {
      const authorUser = users[currentUserId || ''] || {
        id: currentUserId,
        username: 'currentUser',
        displayName: 'Current User',
        status: 'online',
      };

      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        channelId: channel?.id || directMessage?.id || 'ch-custom',
        authorId: currentUserId || '',
        author: authorUser,
        content: sanitized,
        timestamp: new Date().toISOString(),
        type: 'normal',
        reactions: [],
        attachments: attachment ? [attachment] : undefined,
        replyToId: replyingTo?.id || null,
        replyTo: replyingTo || null,
      };

      setLocalMessages((prev) => [...prev, newMsg]);
    }

    setInputText('');
    setAttachment(null);
    setReplyingTo(null);
    setIsEmojiPickerOpen(false);
    setMentionQuery(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      setReplyingTo(null);
      setMentionQuery(null);
    }
  };

  // Reacciones a mensajes
  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (onToggleReaction) {
      onToggleReaction(messageId, emoji);
      return;
    }

    setLocalMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentReactions: Reaction[] = msg.reactions ? [...msg.reactions] : [];
        const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);

        if (existingIdx >= 0) {
          const r = currentReactions[existingIdx];
          const hasReacted = r.hasReacted || r.users.includes(currentUserId || '');
          if (hasReacted) {
            const updatedUsers = r.users.filter((uid) => uid !== (currentUserId || ''));
            if (updatedUsers.length === 0) {
              currentReactions.splice(existingIdx, 1);
            } else {
              currentReactions[existingIdx] = {
                ...r,
                count: r.count - 1,
                users: updatedUsers,
                hasReacted: false,
              };
            }
          } else {
            currentReactions[existingIdx] = {
              ...r,
              count: r.count + 1,
              users: [...r.users, currentUserId || ''],
              hasReacted: true,
            };
          }
        } else {
          currentReactions.push({
            emoji,
            count: 1,
            users: [currentUserId || ''],
            hasReacted: true,
          });
        }

        return { ...msg, reactions: currentReactions };
      })
    );
    setReactionPickerMessageId(null);
  };

  // Edición de mensaje
  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
    setActiveContextMenuMessageId(null);
  };

  const handleSaveEdit = (messageId: string) => {
    const sanitized = sanitizeText(editContent.trim());
    if (!sanitized) return;

    if (onEditMessage) {
      onEditMessage(messageId, sanitized);
    } else {
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: sanitized, editedTimestamp: new Date().toISOString() }
            : m
        )
      );
    }
    setEditingMessageId(null);
    setEditContent('');
  };

  // Eliminación de mensaje
  const handleDeleteMessage = (messageId: string) => {
    if (onDeleteMessage) {
      onDeleteMessage(messageId);
    } else {
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, type: 'deleted', content: '' } : m))
      );
    }
    setActiveContextMenuMessageId(null);
  };

  // Fijado de mensaje
  const handleTogglePin = (msg: Message) => {
    if (onPinMessage) {
      onPinMessage(msg.id);
    } else {
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m))
      );
    }
    setActiveContextMenuMessageId(null);
  };

  // Copiar texto
  const handleCopyText = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
    setActiveContextMenuMessageId(null);
  };

  // Simular adjuntar archivo
  const handleAttachMock = () => {
    const mockAtt: MessageAttachment = {
      id: `att-${Date.now()}`,
      name: 'discordia-preview.png',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      size: '1.2 MB',
      type: 'image/png',
    };
    setAttachment(mockAtt);
  };

  // Renderizado con formato: menciones, negritas y enlaces
  const renderFormattedContent = (content: string) => {
    const sanitized = sanitizeText(content);
    const parts = sanitized.split(/(\*\*[^*]+\*\*|@[\w\d_-]+|https?:\/\/[^\s]+)/g);

    return parts.map((part, index) => {
      if (!part) return null;
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={{ color: 'var(--header-primary)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
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
            style={{ color: 'var(--text-link)', wordBreak: 'break-all' }}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Mensajes fijados
  const pinnedMessages = useMemo(() => localMessages.filter((m) => m.isPinned), [localMessages]);

  return (
    <div className="chat-container">
      {/* ==========================================================================
          1. CABECERA DEL CANAL / DM
          ========================================================================== */}
      <header className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
          {isDirectMessage ? (
            <div style={{ position: 'relative', width: 28, height: 28 }}>
              <img
                src={
                  directMessage?.recipient?.avatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                }
                alt={chatTitle}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
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

          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--header-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {chatTitle}
          </h2>

          <div
            style={{
              width: 1,
              height: 16,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              margin: '0 4px',
              flexShrink: 0,
            }}
          />

          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {chatTopic}
          </p>
        </div>

        {/* Acciones de la Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-tertiary)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-xs)',
              gap: 6,
              marginLeft: 4,
            }}
          >
            <input
              type="text"
              placeholder="Search"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-normal)',
                fontSize: 12,
                width: 120,
              }}
            />
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </header>

      {/* ==========================================================================
          MODAL / DROPDOWN DE MENSAJES FIJADOS
          ========================================================================== */}
      {isPinnedPanelOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'var(--header-height)',
            right: 16,
            width: 400,
            maxHeight: 480,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-floating)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Pin size={16} style={{ color: 'var(--status-idle)' }} />
              <span style={{ fontWeight: 600, color: 'var(--header-primary)', fontSize: 13 }}>
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
          <div style={{ overflowY: 'auto', padding: '8px 12px', flex: 1 }}>
            {pinnedMessages.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                No pinned messages in this channel yet.
              </p>
            ) : (
              pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 10,
                    marginBottom: 8,
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--header-primary)', fontSize: 12 }}>
                      {msg.author?.displayName || 'User'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-normal)' }}>{msg.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==========================================================================
          2. HILO DE MENSAJES
          ========================================================================== */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mensaje de Bienvenida del Canal */}
        <div style={{ padding: '32px 16px 16px 16px' }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              backgroundColor: '#404249',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            {isDirectMessage ? (
              <span style={{ fontSize: 32 }}>👋</span>
            ) : (
              <Hash size={44} style={{ color: 'var(--header-primary)' }} />
            )}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--header-primary)', marginBottom: 8 }}>
            Welcome to {isDirectMessage ? chatTitle : `#${chatTitle}`}!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
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
          <div style={{ flex: 1, padding: '16px 0', overflow: 'hidden' }}>
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
                <div style={{ width: 40, marginRight: 16 }} />
                <div className="message-content-wrapper">
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
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
                <span style={{ marginRight: 8 }}>✨</span>
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
                <div
                  style={{
                    width: 40,
                    marginRight: 16,
                    textAlign: 'right',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    opacity: 0.6,
                    userSelect: 'none',
                    lineHeight: '22px',
                  }}
                >
                  {formatCompactTime(msg.timestamp)}
                </div>
              ) : (
                <img
                  src={
                    authorUser?.avatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                  }
                  alt={authorUser?.displayName || 'User'}
                  className="message-avatar"
                  onClick={() => authorUser && onOpenUserProfile?.(authorUser.id)}
                />
              )}

              {/* Contenido del Mensaje */}
              <div className="message-content-wrapper">
                {/* Referencia de Respuesta previa si existe */}
                {msg.replyTo && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      marginBottom: 4,
                    }}
                  >
                    <CornerUpLeft size={12} />
                    <span style={{ fontWeight: 600, color: 'var(--interactive-hover)' }}>
                      @{msg.replyTo.author?.displayName || 'User'}
                    </span>
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 360,
                      }}
                    >
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
                        style={{ display: 'flex', alignItems: 'center', color: 'var(--status-idle)' }}
                      >
                        <Pin size={12} />
                      </span>
                    )}
                  </div>
                )}

                {/* Editor Inline si está en modo edición */}
                {editingMessageId === msg.id ? (
                  <div style={{ marginTop: 4 }}>
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
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
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
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
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
                            style={{ maxHeight: 320, cursor: 'pointer' }}
                            onClick={() => window.open(att.url, '_blank')}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={att.id} className="file-attachment-card">
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--brand)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                          }}
                        >
                          <FileText size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-link)',
                              display: 'block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontSize: 13,
                            }}
                          >
                            {att.name}
                          </a>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
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
                          <span style={{ fontWeight: 600 }}>{r.count}</span>
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
      <div style={{ padding: '0 16px 20px 16px', position: 'relative' }}>
        {/* Indicador de Respuesta "Replying to..." */}
        {replyingTo && (
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderTopLeftRadius: 'var(--radius-md)',
              borderTopRightRadius: 'var(--radius-md)',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-muted)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Replying to</span>
              <strong style={{ color: 'var(--header-primary)' }}>
                @{replyingTo.author?.displayName || 'User'}
              </strong>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--interactive-normal)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Previsualización de archivo a adjuntar */}
        {attachment && (
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} style={{ color: 'var(--brand)' }} />
              <span style={{ color: 'var(--text-normal)' }}>{attachment.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({attachment.size})</span>
            </div>
            <button
              onClick={() => setAttachment(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Popover de Autocompletado de Menciones (@) */}
        {mentionCandidates.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 16,
              width: 280,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-floating)',
              zIndex: 100,
              padding: 4,
              marginBottom: 8,
            }}
          >
            <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              MEMBERS MATCHING @{mentionQuery}
            </div>
            {mentionCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="mention-candidate-item"
                onClick={() => handleSelectMention(candidate)}
              >
                <img
                  src={candidate.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={candidate.displayName}
                  style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontWeight: 600, color: 'var(--header-primary)', fontSize: 13 }}>
                  {candidate.displayName}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  @{candidate.username}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Popover de Emojis */}
        {isEmojiPickerOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 16,
              width: 280,
              backgroundColor: 'var(--bg-floating)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-floating)',
              padding: 12,
              zIndex: 100,
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
              EMOJIS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
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
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: replyingTo || attachment ? '0 0 8px 8px' : 'var(--radius-md)',
            padding: '4px 12px',
          }}
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
