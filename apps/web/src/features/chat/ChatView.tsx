import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bell, BellOff, Paperclip, Pin, Search, Smile, Users } from 'lucide-react';
import { distances } from '@discordia/tokens';
import { JUMP_LOAD_FAILED_MESSAGE, JUMP_NOT_FOUND_MESSAGE } from '@discordia/core';
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
  type DmHeaderActionId,
  type DmHeaderLayout,
  type MessageMentions,
} from '@discordia/core';
import type { Channel, Message, MessageAttachment, Role, Status, User } from '../../types';
import { ActionLink, IconButton, IconMenu, Skeleton, SquareAvatar, transitions } from '../../ui';
import { showToast } from '../../app/uiStore';
import {
  EMOJI_CATEGORIES,
  QUICK_EMOJIS,
  mentionLabel,
  sanitizeText,
  useChatViewState,
  type ChatViewState,
  type DirectChat,
  type Mentionables,
} from './useChatViewState';
import { DM_HEADER_ICONS } from './dmHeaderIcons';
import styles from './ChatView.module.css';

export interface ChatViewProps {
  /** Canal activo si la vista corresponde a un servidor. */
  channel?: Channel | null;
  /** Chat directo activo si la vista corresponde a un DM. */
  directChat?: DirectChat | null;
  /**
   * Encabezado de un DM: qué va como ícono y qué al menú "más" (dmHeaderActions de core, con el estado de los
   * mensajes fijados, que es de esta vista) y qué hacer con cada acción. Fijados y perfil los resuelve ChatView.
   */
  directHeader?: {
    layout: (pinned: { count: number; open: boolean }) => DmHeaderLayout;
    onAction: (id: DmHeaderActionId) => void;
  };
  /** Algo entre el encabezado y los mensajes (en un DM, la llamada en curso). */
  banner?: ReactNode;
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
  /** Si el usuario actual tiene permiso para reaccionar a mensajes en este canal. */
  canAddReactions?: boolean;
  /** Si el usuario actual puede moderar/eliminar mensajes ajenos en este canal. */
  canManageMessages?: boolean;
  /** Callback al eliminar un mensaje. */
  onDeleteMessage?: (messageId: string) => void;
  /** Callback al confirmar la edición de un mensaje existente. */
  onEditMessage?: (messageId: string, newContent: string) => void;
  /** Fija o desfija un mensaje (usePinMessage de core). Sin esto, el fijado es solo local. */
  onPinMessage?: (message: Message) => void;
  /** Fijados que trae el servidor (usePinnedMessagesQuery): incluye los de páginas no cargadas. */
  pinnedMessages?: Message[];
  /** Si el usuario puede fijar en esta conversación (canPinMessages de core). Por defecto sí. */
  canPinMessages?: boolean;
  /**
   * Carga páginas anteriores hasta tener el mensaje (loadUntil de useChannelMessagesQuery), para ir a un
   * fijado que no está cargado. Sin esto solo se puede ir a los cargados.
   */
  onLoadUntilMessage?: (messageId: string) => Promise<boolean>;
  /** Callback para abrir el perfil del usuario clicado. */
  onOpenUserProfile?: (userId: string) => void;
  /** Callback para mostrar u ocultar la barra lateral de miembros. */
  onToggleMemberList?: () => void;
  /** Estado de visibilidad de la barra lateral de miembros. */
  isMemberListOpen?: boolean;
  /** Abre la búsqueda de mensajes del servidor. Sin esto (DMs) no se muestra el botón. */
  onOpenSearch?: () => void;
  /**
   * Búsqueda dentro del DM (acción `search` del encabezado): qué mostrar mientras está abierta. Recibe cómo
   * cerrarla y cómo ir a un mensaje (el mismo salto de los fijados).
   */
  renderDirectSearch?: (controls: { onClose: () => void; onJump: (messageId: string) => void }) => ReactNode;
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

/** Cuánto queda marcado el mensaje al que se fue (lo mismo que dura la animación de .highlighted). */
const HIGHLIGHT_MS = 2000;

/**
 * Ir a un mensaje (desde los fijados): si no está cargado pide las páginas anteriores, después lo centra y
 * lo marca un momento. Suelta el final antes de cargar y otra vez justo antes del scroll: al sumarse las
 * páginas el navegador deja la vista abajo y eso vuelve a pegarla (useStickToBottom).
 * El scroll es instantáneo: uno suave pasa cerca del final, se vuelve a pegar y el ResizeObserver lo baja.
 */
function useJumpToMessage(
  scrollRef: RefObject<HTMLDivElement | null>,
  messages: Message[],
  { loadUntil, release }: { loadUntil?: (messageId: string) => Promise<boolean>; release: () => void }
) {
  // Mensaje al que hay que ir en cuanto su fila esté dibujada
  const [target, setTarget] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const jumpTo = useCallback(
    async (messageId: string) => {
      release();
      let found = messages.some((m) => m.id === messageId);
      if (!found && loadUntil) {
        try {
          found = await loadUntil(messageId);
        } catch {
          showToast(JUMP_LOAD_FAILED_MESSAGE, 'danger');
          return;
        }
      }
      if (!found) {
        showToast(JUMP_NOT_FOUND_MESSAGE, 'info');
        return;
      }
      setTarget(messageId);
    },
    [messages, loadUntil, release]
  );

  // Corre de nuevo con cada cambio de mensajes: la página que trajo loadUntil puede dibujarse después
  useLayoutEffect(() => {
    if (!target) return;
    const row = scrollRef.current?.querySelector<HTMLElement>(`[data-message-id="${target}"]`);
    if (!row) return;
    release();
    row.scrollIntoView?.({ block: 'center' });
    setHighlighted(target);
    setTarget(null);
  }, [target, messages, scrollRef, release]);

  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  return { jumpTo, highlighted };
}

/** Distancia al final (px) que todavía cuenta como "estar abajo". */
const NEAR_BOTTOM = 80;

/**
 * Mantiene el chat abajo de todo mientras se esté abajo: al abrirlo, cuando llega un mensaje y cuando el
 * contenido crece después de dibujarse (una imagen que termina de cargar). Un solo scroll al último
 * mensaje no alcanza: las imágenes cargan después y lo dejaban corto. Subir a leer lo suelta; volver
 * abajo, enviar un mensaje o cambiar de chat lo vuelve a pegar.
 */
function useStickToBottom(
  scrollRef: RefObject<HTMLDivElement | null>,
  chatKey: string,
  lastMessage: Pick<Message, 'id' | 'authorId'> | undefined,
  currentUserId: string | undefined,
  layoutKey: string
) {
  const stick = useRef(true);
  const lastScrollTop = useRef(0);

  const toBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
    // Sin esperar al evento de scroll: el próximo scroll del usuario se compara contra esta posición
    lastScrollTop.current = el.scrollTop;
  }, [scrollRef]);

  useLayoutEffect(() => {
    stick.current = true;
    lastScrollTop.current = 0;
  }, [chatKey]);

  // Antes de pintar, para que no se vea el salto. Un mensaje propio baja aunque se estuviera leyendo arriba.
  const lastId = lastMessage?.id;
  const lastIsMine = Boolean(currentUserId) && lastMessage?.authorId === currentUserId;
  useLayoutEffect(() => {
    if (lastIsMine) stick.current = true;
    toBottom();
  }, [lastId, lastIsMine, toBottom]);

  // Lo que crece después de dibujarse. layoutKey cambia cuando se reemplazan los hijos (skeleton → mensajes)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(toBottom);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [scrollRef, toBottom, layoutKey]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
    // Solo un scroll hacia arriba lo suelta: crecer el contenido o bajar por código no
    if (el.scrollTop < lastScrollTop.current - 1 && fromBottom > NEAR_BOTTOM) stick.current = false;
    if (fromBottom <= NEAR_BOTTOM) stick.current = true;
    lastScrollTop.current = el.scrollTop;
  }, [scrollRef]);

  /** Suelta el final: cargar mensajes anteriores no tiene que volver a bajar. */
  const release = useCallback(() => {
    stick.current = false;
  }, []);

  return { onScroll, release };
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
    directHeader,
    messages,
    isLoading = false,
    currentUserId,
    users = {},
    onOpenUserProfile,
    onToggleMemberList,
    isMemberListOpen = true,
    onOpenSearch,
    hasOlderMessages = false,
    isLoadingOlder = false,
    onLoadOlder,
  } = props;
  const chat = useChatViewState({ ...props, messages });
  const chatKey = channel?.id ?? directChat?.conversationId ?? directChat?.user.id ?? 'chat';
  const history = useHistoryIds(chatKey, chat.localMessages, isLoading);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const showOlder = hasOlderMessages && !isLoading;
  const stick = useStickToBottom(
    scrollRef,
    chatKey,
    chat.localMessages[chat.localMessages.length - 1],
    currentUserId,
    `${isLoading}-${showOlder}`
  );
  const older = useLoadOlder(scrollRef, chat.localMessages[0]?.id, {
    hasOlder: showOlder,
    isLoadingOlder,
    onLoadOlder: onLoadOlder
      ? () => {
          stick.release();
          onLoadOlder();
        }
      : undefined,
  });
  const onScroll = () => {
    stick.onScroll();
    older.onScroll();
  };
  const jump = useJumpToMessage(scrollRef, chat.localMessages, {
    loadUntil: props.onLoadUntilMessage,
    release: stick.release,
  });
  const names = useMentionNames(users, props.mentionables?.roles);
  const myRoleIds = props.mentionables?.myRoleIds;
  // Chat para el que se abrió la búsqueda del DM: al cambiar de conversación deja de estar abierta sola
  const [directSearchKey, setDirectSearchKey] = useState<string | null>(null);
  const isDirectSearchOpen = directSearchKey === chatKey;

  return (
    <div className={styles.chat}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>{chat.isDirectMessage ? chat.chatTitle : `•${chat.chatTitle}`}</h1>
          {directChat && <span className={styles.presence}>{PRESENCE_LABEL[directChat.user.status] ?? PRESENCE_LABEL.offline}/</span>}
          {chat.chatTopic !== 'No topic set.' && <p className={styles.topic}>{chat.chatTopic}</p>}
        </div>
        <nav className={styles.links} aria-label="Acciones del chat">
          {chat.isDirectMessage ? (
            directChat && directHeader && (
              <DirectHeaderActions
                layout={directHeader.layout({ count: chat.pinnedMessages.length, open: chat.isPinnedPanelOpen })}
                onAction={(id) => {
                  if (id === 'pins') chat.setIsPinnedPanelOpen((v) => !v);
                  else if (id === 'search') setDirectSearchKey(chatKey);
                  else if (id === 'profile') onOpenUserProfile?.(directChat.user.id);
                  else directHeader.onAction(id);
                }}
              />
            )
          ) : (
            <>
              {onOpenSearch && <IconButton icon={Search} label="Buscar mensajes" onPress={onOpenSearch} />}
              <IconButton
                icon={chat.isNotificationsMuted ? BellOff : Bell}
                label="Silenciar notificaciones"
                pressed={chat.isNotificationsMuted}
                onPress={() => chat.setIsNotificationsMuted((v) => !v)}
              />
              <IconButton
                icon={Pin}
                label="Mensajes fijados"
                badge={chat.pinnedMessages.length}
                pressed={chat.isPinnedPanelOpen}
                onPress={() => chat.setIsPinnedPanelOpen((v) => !v)}
              />
              {onToggleMemberList && (
                <IconButton icon={Users} label="Lista de miembros" pressed={isMemberListOpen} onPress={onToggleMemberList} />
              )}
            </>
          )}
        </nav>
      </header>

      {props.banner}

      {/* En el body: .chat es un container query y encerraría al modal (position: fixed) en el área del chat */}
      {createPortal(
        <AnimatePresence>
          {isDirectSearchOpen &&
            props.renderDirectSearch?.({
              onClose: () => setDirectSearchKey(null),
              onJump: (messageId) => void jump.jumpTo(messageId),
            })}
        </AnimatePresence>,
        document.body
      )}

      {chat.isPinnedPanelOpen && (
        <PinnedPanel
          chat={chat}
          users={users}
          names={names}
          onJump={(messageId) => {
            chat.setIsPinnedPanelOpen(false);
            void jump.jumpTo(messageId);
          }}
        />
      )}

      <div
        ref={scrollRef}
        className={styles.scroll}
        role="log"
        aria-label={`Mensajes de ${chat.chatTitle}`}
        onScroll={onScroll}
      >
        {showOlder ? (
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
                    canManageMessages={props.canManageMessages}
                    canAddReactions={props.canAddReactions ?? true}
                    myRoleIds={myRoleIds}
                    names={names}
                    consecutive={consecutive}
                    isNew={!history.has(msg.id)}
                    highlighted={jump.highlighted === msg.id}
                    onOpenUserProfile={onOpenUserProfile}
                  />
                </Fragment>
              );
            })}
          </ol>
        )}
      </div>

      <Composer chat={chat} users={users} writeBlock={props.writeBlock ?? null} />
    </div>
  );
}

/** Presencia al lado del nombre en un DM, como en la lista de mensajes directos. */
const PRESENCE_LABEL: Record<Status, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  invisible: 'Desconectado',
  offline: 'Desconectado',
};

/** Las acciones de un DM: íconos y, si hace falta, el menú "más" con las raras o destructivas. */
function DirectHeaderActions({ layout, onAction }: { layout: DmHeaderLayout; onAction: (id: DmHeaderActionId) => void }) {
  return (
    <>
      {layout.icons.map((action) => (
        <IconButton
          key={action.id}
          icon={DM_HEADER_ICONS[action.icon]}
          label={action.label}
          pressed={action.pressed}
          badge={action.badge}
          disabled={action.disabled}
          tone={action.destructive ? 'danger' : 'default'}
          onPress={() => onAction(action.id)}
        />
      ))}
      <IconMenu
        items={layout.menu.map((action) => ({
          id: action.id,
          icon: DM_HEADER_ICONS[action.icon],
          label: action.label,
          tone: action.destructive ? 'danger' : 'default',
          disabled: action.disabled,
          onPress: () => onAction(action.id),
        }))}
      />
    </>
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
  canManageMessages,
  canAddReactions = true,
  myRoleIds,
  names,
  consecutive,
  isNew,
  highlighted = false,
  onOpenUserProfile,
}: {
  msg: Message;
  chat: ChatViewState;
  users: Record<string, User>;
  currentUserId?: string;
  canManageMessages?: boolean;
  canAddReactions?: boolean;
  myRoleIds?: string[];
  names: MentionNames;
  consecutive: boolean;
  isNew: boolean;
  /** Se acaba de ir a este mensaje (desde los fijados). */
  highlighted?: boolean;
  onOpenUserProfile?: (userId: string) => void;
}) {
  const reduce = useReducedMotion();
  const enter = {
    initial: isNew ? (reduce ? { opacity: 0 } : { opacity: 0, y: distances.rise }) : false,
    animate: { opacity: 1, y: 0 },
    transition: reduce ? transitions.reduced : transitions.base,
  } as const;

  const rowRef = useRef<HTMLLIElement | null>(null);
  const [openUpwards, setOpenUpwards] = useState(false);
  const menuOpen = chat.activeContextMenuMessageId === msg.id;
  const pickerOpen = chat.reactionPickerMessageId === msg.id;

  useLayoutEffect(() => {
    if (pickerOpen || menuOpen) {
      if (rowRef.current && typeof window !== 'undefined') {
        const rect = rowRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpwards(spaceBelow < 320);
      }
    }
  }, [pickerOpen, menuOpen]);

  if (msg.type === 'deleted') {
    return (
      <motion.li className={`${styles.message} ${styles.compact}`} data-message-id={msg.id} {...enter}>
        <span className={styles.gutter} />
        <p className={styles.deleted}>/ este mensaje fue eliminado</p>
      </motion.li>
    );
  }

  if (msg.type === 'system') {
    return (
      <motion.li className={`${styles.message} ${styles.compact}`} data-message-id={msg.id} {...enter}>
        <span className={styles.gutter} />
        <p className={styles.system}>
          •{msg.content} <time className={styles.time}>{formatMessageTime(msg.timestamp)}</time>
        </p>
      </motion.li>
    );
  }

  const author = msg.author || users[msg.authorId] || { id: msg.authorId, ...UNKNOWN_USER };
  const isAuthor = msg.authorId === (currentUserId || '');
  const canDelete = isAuthor || !!canManageMessages;
  // Lo que dice Chat-Engine que notificó: un @everyone sin permiso no resalta
  const mentionsMe = !isAuthor && mentionsUser(msg.mentions, currentUserId ?? '', myRoleIds);
  const isEditing = chat.editingMessageId === msg.id;
  const isReplying = chat.replyingTo?.id === msg.id;
  const openProfile = () => onOpenUserProfile?.(author.id);

  return (
    <motion.li
      ref={rowRef}
      className={[
        styles.message,
        consecutive ? styles.compact : '',
        mentionsMe ? styles.mentioned : '',
        isReplying ? styles.replying : '',
        menuOpen || pickerOpen ? styles.toolsOpen : '',
        highlighted ? styles.highlighted : '',
      ].join(' ')}
      data-message-id={msg.id}
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
            {(msg.editedTimestamp || msg.edited) && <span className={styles.edited}> (editado)</span>}
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
                  onClick={() => {
                    if (!active && !canAddReactions) {
                      showToast('No tenés permiso para agregar reacciones', 'danger');
                      return;
                    }
                    chat.handleToggleReaction(msg.id, r.emoji);
                  }}
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
          {canAddReactions &&
            QUICK_EMOJIS.map((emoji) => (
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
          {canAddReactions && (
            <ActionLink onPress={() => chat.setReactionPickerMessageId(pickerOpen ? null : msg.id)} aria-expanded={pickerOpen}>
              reaccionar
            </ActionLink>
          )}
          <ActionLink onPress={() => chat.setReplyingTo(msg)}>responder</ActionLink>
          {isAuthor && <ActionLink onPress={() => chat.handleStartEdit(msg)}>editar</ActionLink>}
          {canDelete && (
            <ActionLink className={styles.dangerLink} onPress={() => chat.promptDeleteMessage(msg.id)}>
              eliminar
            </ActionLink>
          )}
          <ActionLink onPress={() => chat.setActiveContextMenuMessageId(menuOpen ? null : msg.id)} aria-expanded={menuOpen}>
            más
          </ActionLink>
        </div>
      )}

      {pickerOpen && (
        <Popover
          className={`${styles.messagePopover} ${openUpwards ? styles.messagePopoverUp : ''}`}
          label="Reacciones"
          onClose={() => chat.setReactionPickerMessageId(null)}
        >
          <EmojiGrid onPick={(emoji) => chat.handleToggleReaction(msg.id, emoji)} />
        </Popover>
      )}

      {menuOpen && (
        <Popover
          className={`${styles.messagePopover} ${openUpwards ? styles.messagePopoverUp : ''}`}
          label="Más acciones"
          onClose={() => chat.setActiveContextMenuMessageId(null)}
        >
          <ul className={styles.menu}>
            <li>
              <button type="button" onClick={() => chat.handleCopyText(mentionsToText(msg.content, names), msg.id)}>
                {chat.copiedMessageId === msg.id ? 'copiado/' : 'copiar texto'}
              </button>
            </li>
            {chat.canPin(msg) && (
              <li>
                <button type="button" onClick={() => chat.handleTogglePin(msg)}>
                  {msg.isPinned ? 'desfijar mensaje' : 'fijar mensaje'}
                </button>
              </li>
            )}
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

function PinnedPanel({
  chat,
  users,
  names,
  onJump,
}: {
  chat: ChatViewState;
  users: Record<string, User>;
  names: MentionNames;
  onJump: (messageId: string) => void;
}) {
  return (
    <Popover className={styles.pinned} label="Mensajes fijados" onClose={() => chat.setIsPinnedPanelOpen(false)}>
      <p className={styles.popoverTitle}>Mensajes fijados /</p>
      {chat.pinnedMessages.length === 0 ? (
        <p className={styles.popoverEmpty}>/ todavía no hay mensajes fijados en esta conversación.</p>
      ) : (
        <ul className={styles.pinnedList}>
          {chat.pinnedMessages.map((msg) => {
            const name = (msg.author || users[msg.authorId])?.displayName || 'Usuario';
            return (
              <li key={msg.id}>
                <button
                  type="button"
                  className={styles.pinnedJump}
                  onClick={() => onJump(msg.id)}
                  aria-label={`Ir al mensaje de ${name}`}
                >
                  <span className={styles.meta}>
                    <strong>{name}</strong> <span className={styles.time}>{formatMessageTime(msg.timestamp)}</span>
                  </span>
                  <span className={styles.pinnedText}>{mentionsToText(msg.content, names)}</span>
                </button>
                {chat.canPinMessages && (
                  <p className={styles.meta}>
                    <ActionLink onPress={() => chat.handleTogglePin(msg)}>desfijar</ActionLink>
                  </p>
                )}
              </li>
            );
          })}
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
        <Popover className={styles.composerEmojiPopover} label="Emojis" onClose={() => chat.setIsEmojiPickerOpen(false)}>
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleJumpToCategory = (catId: string) => {
    if (!containerRef.current) return;
    const target = containerRef.current.querySelector<HTMLElement>(`[data-category="${catId}"]`);
    if (target) {
      const top = target.offsetTop - containerRef.current.offsetTop;
      if (typeof containerRef.current.scrollTo === 'function') {
        containerRef.current.scrollTo({ top, behavior: 'smooth' });
      } else {
        containerRef.current.scrollTop = top;
      }
    }
  };

  return (
    <div>
      <nav className={styles.categoryNav} aria-label="Categorías de emojis">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={styles.categoryNavButton}
            onClick={() => handleJumpToCategory(cat.id)}
            title={cat.name}
            aria-label={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </nav>

      <div ref={containerRef} className={styles.emojiPicker}>
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.id} data-category={cat.id} className={styles.emojiCategory}>
            <div className={styles.emojiCategoryTitle}>{cat.name}</div>
            {cat.isPlaceholder ? (
              <div className={styles.emojiPlaceholder}>{cat.description}</div>
            ) : (
              <div className={styles.emojiGrid}>
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={styles.emoji}
                    onClick={() => onPick(emoji)}
                    aria-label={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Panel flotante de línea fina; se cierra al hacer clic afuera o con Escape. */
function Popover({ children, className, label, onClose }: { children: ReactNode; className: string; label: string; onClose: () => void }) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (target.closest('[aria-expanded="true"]')) return;
      onClose();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
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
