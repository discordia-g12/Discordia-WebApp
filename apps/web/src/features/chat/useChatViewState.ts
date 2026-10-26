import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Channel, DirectMessage, Message, MessageAttachment, Reaction, User } from '../../types';

/** Emojis disponibles para reacciones rápidas y selector. */
export const QUICK_EMOJIS = ['❤️', '👍', '😂', '🚀', '🔥', '🎉', '👏', '👀'];
export const POPULAR_EMOJIS = [
  '😀', '😂', '😍', '😎', '🥳', '🤔', '🙌', '👍',
  '❤️', '🔥', '✨', '🚀', '💯', '🛡️', '⚡', '☕'
];

/**
 * Limpia caracteres nulos \x00 para evitar fallos de persistencia en PostgreSQL.
 */
export function sanitizeText(raw: string): string {
  // eslint-disable-next-line no-control-regex -- el \x00 es justamente lo que se quiere sacar
  return raw.replace(/\x00/g, '');
}

export interface ChatViewStateOptions {
  channel?: Channel | null;
  directMessage?: DirectMessage | null;
  messages?: Message[];
  currentUserId?: string;
  users?: Record<string, User>;
  onSendMessage?: (content: string, attachment?: MessageAttachment, replyToId?: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onPinMessage?: (messageId: string) => void;
}

/**
 * Estado y acciones del chat (mensajes, escritura, respuestas, edición, reacciones, menciones, fijados),
 * compartidos por la vista del rediseño (ChatView) y la anterior (legacy/LegacyChatView). Sin los
 * callbacks, las acciones se aplican solo en local.
 */
export function useChatViewState({
  channel,
  directMessage,
  messages: externalMessages,
  currentUserId,
  users = {},
  onSendMessage,
  onToggleReaction,
  onDeleteMessage,
  onEditMessage,
  onPinMessage,
}: ChatViewStateOptions) {
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
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
      url: '',
      size: '1.2 MB',
      type: 'image/png',
    };
    setAttachment(mockAtt);
  };

  // Mensajes fijados
  const pinnedMessages = useMemo(() => localMessages.filter((m) => m.isPinned), [localMessages]);


  return {
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
    setMentionQuery,
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
  };
}

export type ChatViewState = ReturnType<typeof useChatViewState>;
