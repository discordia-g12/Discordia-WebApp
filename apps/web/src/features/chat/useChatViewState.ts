import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from 'react';
import { encodeMentions, validateAttachmentFile, uploadAttachment, type PickedMention } from '@discordia/core';
import type { Channel, Message, MessageAttachment, Reaction, Role, User } from '../../types';
import { showToast, useUIStore } from '../../app/uiStore';

export {
  QUICK_EMOJIS,
  POPULAR_EMOJIS,
  EMOJI_CATEGORIES,
  type EmojiCategory,
} from '@discordia/core';

/**
 * Limpia caracteres nulos \x00 para evitar fallos de persistencia en PostgreSQL.
 */
export function sanitizeText(raw: string): string {
  // eslint-disable-next-line no-control-regex -- el \x00 es justamente lo que se quiere sacar
  return raw.replace(/\x00/g, '');
}

/** A quién se puede mencionar en un canal de servidor (#46). En los DMs no hay: se sugieren los usuarios conocidos. */
export interface Mentionables {
  /** Miembros del servidor. */
  members: User[];
  /** Roles del servidor, sin el por defecto (a ese se lo menciona con @everyone). */
  roles: Role[];
  /** MENTION_EVERYONE en el canal: solo así se ofrecen @everyone y los roles (Chat-Engine lo vuelve a validar). */
  canMentionEveryone: boolean;
  /** Roles propios en el servidor, para resaltar los mensajes que mencionan a uno de ellos. */
  myRoleIds: string[];
}

/** Chat directo: con quién, y el id de la conversación. null: todavía no existe, nace con el primer mensaje. */
export interface DirectChat {
  conversationId: string | null;
  user: User;
}

export type MentionCandidate =
  | { kind: 'user'; key: string; label: string; token: string; user: User }
  | { kind: 'role'; key: string; label: string; token: string; role: Role }
  | { kind: 'everyone'; key: string; label: string; token: string };

/** Cómo se muestra un usuario en una mención: su username, o el nombre si todavía no llegó su perfil. */
export function mentionLabel(user: User): string {
  return user.username && user.username !== user.id ? user.username : user.displayName;
}

const MAX_USER_CANDIDATES = 5;
const MAX_ROLE_CANDIDATES = 3;

export interface ChatViewStateOptions {
  channel?: Channel | null;
  directChat?: DirectChat | null;
  messages?: Message[];
  currentUserId?: string;
  users?: Record<string, User>;
  mentionables?: Mentionables;
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
  directChat,
  messages: externalMessages,
  currentUserId,
  users = {},
  mentionables,
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Menús flotantes e interactivos
  const [isEmojiPickerOpen, setIsEmojiPickerOpenRaw] = useState(false);
  const [isPinnedPanelOpen, setIsPinnedPanelOpen] = useState(false);
  const [isNotificationsMuted, setIsNotificationsMuted] = useState(false);
  const [activeContextMenuMessageId, setActiveContextMenuMessageIdRaw] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageIdRaw] = useState<string | null>(null);

  const setIsEmojiPickerOpen: Dispatch<SetStateAction<boolean>> = useCallback((action) => {
    setIsEmojiPickerOpenRaw((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next) {
        setActiveContextMenuMessageIdRaw(null);
        setReactionPickerMessageIdRaw(null);
      }
      return next;
    });
  }, []);

  const setActiveContextMenuMessageId: Dispatch<SetStateAction<string | null>> = useCallback((action) => {
    setActiveContextMenuMessageIdRaw((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next) {
        setIsEmojiPickerOpenRaw(false);
        setReactionPickerMessageIdRaw(null);
      }
      return next;
    });
  }, []);

  const setReactionPickerMessageId: Dispatch<SetStateAction<string | null>> = useCallback((action) => {
    setReactionPickerMessageIdRaw((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next) {
        setIsEmojiPickerOpenRaw(false);
        setActiveContextMenuMessageIdRaw(null);
      }
      return next;
    });
  }, []);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorIndex, setMentionCursorIndex] = useState<number>(-1);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  // Menciones elegidas en el autocompletado: se ven como @label y se envían como token
  const [pickedMentions, setPickedMentions] = useState<PickedMention[]>([]);

  const composerInputRef = useRef<HTMLInputElement | null>(null);

  // Título e información de cabecera
  const chatTitle = channel ? channel.name : directChat?.user.displayName || 'Chat';
  const chatTopic = channel?.topic || directChat?.user.customStatus || 'No topic set.';
  const isDirectMessage = Boolean(directChat);
  // Subir un adjunto exige el id de un canal o conversación: el primer mensaje de un DM es solo texto
  const attachmentChannelId = channel?.id ?? directChat?.conversationId ?? null;

  // Autocompletado de @: miembros y, con MENTION_EVERYONE, roles y @everyone
  const mentionCandidates = useMemo<MentionCandidate[]>(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();
    const matches = (...texts: string[]) => texts.some((t) => t.toLowerCase().includes(query));
    const people = mentionables ? mentionables.members : Object.values(users);
    const candidates: MentionCandidate[] = people
      .filter((u) => matches(u.username, u.displayName))
      .slice(0, MAX_USER_CANDIDATES)
      .map((user) => ({ kind: 'user', key: `user:${user.id}`, label: mentionLabel(user), token: `<@${user.id}>`, user }));
    if (mentionables?.canMentionEveryone) {
      mentionables.roles
        .filter((role) => matches(role.name))
        .slice(0, MAX_ROLE_CANDIDATES)
        .forEach((role) => candidates.push({ kind: 'role', key: `role:${role.id}`, label: role.name, token: `<@&${role.id}>`, role }));
      if ('everyone'.startsWith(query)) {
        candidates.push({ kind: 'everyone', key: 'everyone', label: 'everyone', token: '@everyone' });
      }
    }
    return candidates;
  }, [mentionQuery, users, mentionables]);

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
      setActiveMentionIndex(0);
    } else {
      setMentionQuery(null);
      setMentionCursorIndex(-1);
    }
  };

  const handleSelectMention = (candidate: MentionCandidate) => {
    if (mentionCursorIndex === -1) return;
    const before = inputText.slice(0, mentionCursorIndex);
    const after = inputText.slice(mentionCursorIndex + (mentionQuery?.length || 0) + 1);
    const completed = `${before}@${candidate.label} ${after}`;
    setInputText(completed);
    if (candidate.kind !== 'everyone') {
      setPickedMentions((prev) => [...prev, { label: candidate.label, token: candidate.token }]);
    }
    setMentionQuery(null);
    setMentionCursorIndex(-1);
    composerInputRef.current?.focus();
  };

  // Envío de mensaje
  const handleSend = async () => {
    if (isUploading) return;
    // Lo elegido en el autocompletado y, si se escribió a mano, el @username de un miembro
    const typed = (mentionables?.members ?? []).map((u) => ({ label: mentionLabel(u), token: `<@${u.id}>` }));
    const sanitized = encodeMentions(sanitizeText(inputText.trim()), [...pickedMentions, ...typed]);
    if (!sanitized && !attachment && !pendingFile) return;

    let finalAttachment = attachment;

    if (pendingFile && attachmentChannelId) {
      try {
        setIsUploading(true);
        const uploaded = await uploadAttachment(attachmentChannelId, pendingFile);
        finalAttachment = uploaded;
      } catch (err: unknown) {
        setIsUploading(false);
        const msg = (err instanceof Error && err.message) || 'No se pudo subir el archivo.';
        showToast(msg, 'danger');
        return;
      } finally {
        setIsUploading(false);
      }
    }

    if (onSendMessage) {
      onSendMessage(sanitized, finalAttachment || undefined, replyingTo?.id);
    } else {
      const authorUser = users[currentUserId || ''] || {
        id: currentUserId,
        username: 'currentUser',
        displayName: 'Current User',
        status: 'online',
      };

      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        channelId: attachmentChannelId || 'ch-custom',
        authorId: currentUserId || '',
        author: authorUser,
        content: sanitized,
        timestamp: new Date().toISOString(),
        type: 'normal',
        reactions: [],
        attachments: finalAttachment ? [finalAttachment] : undefined,
        replyToId: replyingTo?.id || null,
        replyTo: replyingTo || null,
      };

      setLocalMessages((prev) => [...prev, newMsg]);
    }

    setInputText('');
    setPickedMentions([]);
    setPendingFile(null);
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setReplyingTo(null);
    setIsEmojiPickerOpen(false);
    setMentionQuery(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Con el autocompletado abierto: flechas para moverse, Enter o Tab para elegir
    if (mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActiveMentionIndex((i) => (i + step + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(mentionCandidates[Math.min(activeMentionIndex, mentionCandidates.length - 1)]);
        return;
      }
    }
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

  const promptDeleteMessage = (messageId: string) => {
    setActiveContextMenuMessageId(null);
    useUIStore.getState().openConfirm('delete-message', 'este mensaje', '', () => {
      handleDeleteMessage(messageId);
    });
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

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateAttachmentFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (error) {
      showToast(error, 'danger');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingFile(file);
    setAttachment({
      id: `preview-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    });
  };

  const handleRemoveAttachment = () => {
    setPendingFile(null);
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    canAttach: attachmentChannelId !== null,
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
    pendingFile,
    isUploading,
    fileInputRef,
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
    activeMentionIndex,
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
    promptDeleteMessage,
    handleTogglePin,
    handleCopyText,
    handleAttachMock,
    handleAttachClick,
    handleFileChange,
    handleRemoveAttachment,
  };
}

export type ChatViewState = ReturnType<typeof useChatViewState>;
