import type { VideoTrack } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MicOff, HeadphoneOff, Lock, VolumeX } from 'lucide-react';
import { isLocalCategoryId, isVoiceChannelLocked } from '@discordia/core';
import type { ServerOwnershipTransfer } from '@discordia/core';
import type { Channel, Server, User } from '../../types';
import { ActionLink, SectionLabel, Skeleton, SquareAvatar } from '../../ui';
import { VoiceParticipantMenu } from '../voice/VoiceParticipantMenu';
import { useChannelDragAndDrop, type DropTarget } from './useChannelDragAndDrop';
import { channelUnreadDescription, formatUnreadCount } from '../servers/unread';
import styles from './ChannelSidebar.module.css';

export interface VoiceParticipant {
  /** Objeto de usuario conectado. */
  user: User;
  /** Indica si el usuario está emitiendo voz activamente. */
  isSpeaking?: boolean;
  /** Indica si tiene su micrófono silenciado. */
  isMuted?: boolean;
  /** Indica si tiene ensordecido su audio. */
  isDeafened?: boolean;
  /** Cámara prendida (solo en la sala en la que estoy): se muestra en su ficha. */
  videoTrack?: VideoTrack | null;
  /** Pantalla compartida activa (solo en la sala en la que estoy): se muestra en su ficha dedicada. */
  screenShareTrack?: VideoTrack | null;
}

export interface ChannelSidebarProps {
  /** Servidor activo cuyos canales y opciones se despliegan. */
  server: Server;
  /** Identificador del canal actualmente seleccionado en la vista activa. */
  activeChannelId: string | null;
  /** Callback al seleccionar un canal de texto, anuncio o voz. */
  onSelectChannel: (channelId: string) => void;
  /** Usuario actualmente autenticado. */
  currentUser: User;
  /** Indica si la carga del servidor o canales está en progreso. */
  isLoading?: boolean;
  /** Estado de conexión a llamada de voz. */
  isVoiceConnected: boolean;
  /** Identificador del canal de voz activo en la llamada. */
  activeVoiceChannelId: string | null;
  /** Mapa de participantes conectados a canales de voz, indexados por channelId. */
  voiceParticipants?: Record<string, VoiceParticipant[]>;
  /** Usuarios silenciados solo para este cliente. */
  locallyMutedUsers?: Record<string, boolean>;
  /** Silencia o reactiva a un participante solo para este cliente (click derecho). */
  onToggleLocalMute?: (userId: string) => void;
  /** Abre el perfil de un participante de voz (desde el click derecho). */
  onViewParticipantProfile?: (user: User) => void;
  /** Acción para unirse a un canal de voz al hacer clic. */
  onJoinVoiceChannel?: (channelId: string) => void;
  /** Acción para crear un nuevo canal en una categoría. */
  onCreateChannel?: (categoryId?: string) => void;
  /** Acción para crear una nueva categoría. */
  onCreateCategory?: () => void;
  onEditChannel?: (channel: Channel) => void;
  /**
   * Reorden por arrastre: mueve un canal a una categoría, antes de `beforeChannelId`
   * (o al final si es null). Si no se pasa, los canales no se pueden arrastrar.
   */
  onMoveChannel?: (channelId: string, targetCategoryId: string, beforeChannelId: string | null) => void;
  /** Reorden por arrastre: mueve una categoría antes de `beforeCategoryId` (o al final si es null). */
  onMoveCategory?: (categoryId: string, beforeCategoryId: string | null) => void;
  /** Acciones del menú desplegable del servidor */
  onOpenServerBoost?: () => void;
  onInvitePeople?: () => void;
  onOpenServerSettings?: () => void;
  onOpenNotificationSettings?: () => void;
  onOpenPrivacySettings?: () => void;
  onOpenServerProfile?: () => void;
  onToggleHideMutedChannels?: () => void;
  onLeaveServer?: () => void;
  /** Marca como leídos los canales de este servidor. Sin definir (nada sin leer): no se ofrece. */
  onMarkServerRead?: () => void;
  /** Marca como leídos todos los canales de todos los servidores. Sin definir: no se ofrece. */
  onMarkAllRead?: () => void;
  onDeleteServer?: () => void;
  pendingTransfer?: ServerOwnershipTransfer | null;
  onAcceptTransfer?: () => void;
  onRejectTransfer?: () => void;
  onCancelTransfer?: () => void;
  isTransferMutating?: boolean;
}


/**
 * Barra de canales del rediseño (PDF, pág. 7): arriba "Invitar al servidor +" y el menú del servidor;
 * las categorías como títulos cruzados por la línea, que se colapsan; los canales con punto
 * ("•general"), y en los de voz quién está conectado. El nombre del servidor no va acá: es la marca de
 * agua del pie (AppShell). La barra de usuario también es del layout.
 */
export function ChannelSidebar({
  server,
  activeChannelId,
  onSelectChannel,
  currentUser,
  isLoading = false,
  isVoiceConnected,
  activeVoiceChannelId,
  voiceParticipants = {},
  locallyMutedUsers = {},
  onToggleLocalMute,
  onViewParticipantProfile,
  onJoinVoiceChannel,
  onCreateChannel,
  onCreateCategory,
  onEditChannel,
  onMoveChannel,
  onMoveCategory,
  onOpenServerBoost,
  onInvitePeople,
  onOpenServerSettings,
  onOpenNotificationSettings,
  onOpenPrivacySettings,
  onOpenServerProfile,
  onToggleHideMutedChannels,
  onLeaveServer,
  onDeleteServer,
  onMarkServerRead,
  onMarkAllRead,
  pendingTransfer,
  onAcceptTransfer,
  onRejectTransfer,
  onCancelTransfer,
  isTransferMutating = false,
}: ChannelSidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [participantMenu, setParticipantMenu] = useState<{ user: User; x: number; y: number } | null>(null);
  const closeParticipantMenu = useCallback(() => setParticipantMenu(null), []);
  const dnd = useChannelDragAndDrop(server, onMoveChannel, onMoveCategory);
  const isOwner = server.ownerId === currentUser.id;
  const isTransferRecipient =
    Boolean(pendingTransfer && pendingTransfer.targetUserId === currentUser.id && pendingTransfer.status === 'PENDING');
  const isTransferSender =
    Boolean(pendingTransfer && isOwner && pendingTransfer.status === 'PENDING');

  /** data-drop marca dónde va a quedar lo arrastrado (ver .item[data-drop] en el CSS). */
  const dropState = (kind: DropTarget['kind'], id: string) => {
    const target = dnd.dropTarget;
    if (target?.kind !== kind || target.id !== id) return undefined;
    return kind === 'category' && dnd.dragItem?.kind === 'channel' ? 'inside' : target.position;
  };

  const menuItems: MenuItem[] = [
    { label: 'Marcar como leído', onSelect: onMarkServerRead },
    { label: 'Marcar todo como leído', onSelect: onMarkAllRead },
    { label: 'Invitar personas', onSelect: onInvitePeople },
    { label: 'Ajustes del servidor', onSelect: onOpenServerSettings },
    { label: 'Crear canal', onSelect: onCreateChannel ? () => onCreateChannel() : undefined },
    { label: 'Crear categoría', onSelect: onCreateCategory },
    { label: 'Mejora del servidor', onSelect: onOpenServerBoost, detail: `nivel ${server.boostLevel}` },
    { label: 'Ajustes de notificaciones', onSelect: onOpenNotificationSettings },
    { label: 'Ajustes de privacidad', onSelect: onOpenPrivacySettings },
    { label: 'Editar perfil del servidor', onSelect: onOpenServerProfile },
    { label: 'Ocultar canales silenciados', onSelect: onToggleHideMutedChannels },
    isOwner
      ? { label: 'Eliminar servidor', onSelect: onDeleteServer, separated: true }
      : { label: 'Abandonar servidor', onSelect: onLeaveServer, separated: true },
  ];

  return (
    <nav className={styles.sidebar} aria-label={`Canales de ${server.name}`}>
      <div className={styles.top}>
        {onInvitePeople && (
          <button type="button" className={styles.invite} onClick={onInvitePeople}>
            Invitar al servidor <span aria-hidden="true">+</span>
          </button>
        )}
        <ServerMenu serverName={server.name} items={menuItems} />
      </div>

      {isTransferRecipient && onAcceptTransfer && onRejectTransfer && (
        <div className={styles.transferBanner}>
          <p className={styles.transferText}>Te ofrecieron la propiedad de este servidor.</p>
          <div className={styles.transferActions}>
            <ActionLink onPress={onAcceptTransfer} disabled={isTransferMutating}>
              aceptar
            </ActionLink>
            <ActionLink onPress={onRejectTransfer} disabled={isTransferMutating}>
              rechazar
            </ActionLink>
          </div>
        </div>
      )}

      {isTransferSender && onCancelTransfer && (
        <div className={styles.transferBanner}>
          <p className={styles.transferText}>Transferencia de propiedad pendiente.</p>
          <div className={styles.transferActions}>
            <ActionLink onPress={onCancelTransfer} disabled={isTransferMutating}>
              cancelar solicitud
            </ActionLink>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.loading}>
            <Skeleton lines={5} label="Cargando canales" />
          </div>
        ) : (
          server.categories.map((category) => {
            const open = !collapsed[category.id];
            return (
              <section key={category.id} className={styles.category}>
                <div
                  className={styles.categoryHeader}
                  data-drop={dropState('category', category.id)}
                  draggable={Boolean(onMoveCategory) && !isLocalCategoryId(category.id)}
                  onDragStart={(e) => dnd.startDrag(e, { kind: 'category', id: category.id })}
                  onDragEnd={dnd.endDrag}
                  onDragOver={(e) => dnd.handleDragOver(e, 'category', category.id)}
                  onDrop={dnd.handleDrop}
                >
                  <SectionLabel
                    collapsible
                    open={open}
                    onToggle={() => setCollapsed((prev) => ({ ...prev, [category.id]: !prev[category.id] }))}
                  >
                    {category.name}
                  </SectionLabel>
                  {onCreateChannel && (
                    <button
                      type="button"
                      className={styles.addChannel}
                      onClick={() => onCreateChannel(category.id)}
                      aria-label={`Crear canal en ${category.name}`}
                      title={`Crear canal en ${category.name}`}
                    >
                      +
                    </button>
                  )}
                </div>

                {open && (
                  <ul className={styles.channels}>
                    {category.channels.map((channel) => (
                      <li
                        key={channel.id}
                        className={styles.channelItem}
                        data-drop={dropState('channel', channel.id)}
                        draggable={Boolean(onMoveChannel)}
                        onDragStart={(e) => dnd.startDrag(e, { kind: 'channel', id: channel.id })}
                        onDragEnd={dnd.endDrag}
                        onDragOver={(e) => dnd.handleDragOver(e, 'channel', channel.id)}
                        onDrop={dnd.handleDrop}
                      >
                        <ChannelRow
                          channel={channel}
                          active={channel.id === activeChannelId}
                          inCall={isVoiceConnected && channel.id === activeVoiceChannelId}
                          participants={voiceParticipants[channel.id] ?? []}
                          locked={isVoiceChannelLocked(server, channel, currentUser.id)}
                          onSelect={() => {
                            onSelectChannel(channel.id);
                            if (channel.type === 'voice') onJoinVoiceChannel?.(channel.id);
                          }}
                          onEdit={onEditChannel ? () => onEditChannel(channel) : undefined}
                        />
                        {channel.type === 'voice' && (voiceParticipants[channel.id]?.length ?? 0) > 0 && (
                          <ul className={styles.participants} aria-label={`Conectados a ${channel.name}`}>
                            {voiceParticipants[channel.id].map((p) => {
                              const isOther = p.user.id !== currentUser.id;
                              const locallyMuted = isOther && Boolean(locallyMutedUsers[p.user.id]);
                              return (
                                <li
                                  key={p.user.id}
                                  className={`${styles.participant} ${p.isSpeaking ? styles.speaking : ''}`}
                                  onContextMenu={(e) => {
                                    if (!isOther || !onToggleLocalMute) return;
                                    e.preventDefault();
                                    setParticipantMenu({ user: p.user, x: e.clientX, y: e.clientY });
                                  }}
                                >
                                  <SquareAvatar user={p.user} size={20} />
                                  <span className={styles.participantName}>{p.user.displayName || p.user.username}</span>
                                  <span className={styles.participantFlags}>
                                    {p.isMuted && <MicOff size={12} strokeWidth={1.5} aria-label="Micrófono silenciado" />}
                                    {p.isDeafened && <HeadphoneOff size={12} strokeWidth={1.5} aria-label="Sin audio" />}
                                    {locallyMuted && <VolumeX size={12} strokeWidth={1.5} aria-label="Silenciado para vos" />}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </div>

      {participantMenu && onToggleLocalMute && (
        <VoiceParticipantMenu
          user={participantMenu.user}
          x={participantMenu.x}
          y={participantMenu.y}
          isLocallyMuted={Boolean(locallyMutedUsers[participantMenu.user.id])}
          onToggleLocalMute={onToggleLocalMute}
          onViewProfile={onViewParticipantProfile}
          onClose={closeParticipantMenu}
        />
      )}
    </nav>
  );
}

/** Canal: "•nombre"; el activo en negrita con una barra a la izquierda; _editar al pasar el mouse. */
function ChannelRow({
  channel,
  active,
  inCall,
  participants,
  locked,
  onSelect,
  onEdit,
}: {
  channel: Channel;
  active: boolean;
  inCall: boolean;
  participants: VoiceParticipant[];
  /** Canal de voz sin permiso para conectarse: candado y no se puede entrar. */
  locked: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}) {
  const unread = channel.unreadCount ?? 0;
  const mentions = channel.mentions ?? 0;
  const unreadDescription = channelUnreadDescription(channel);
  return (
    <div className={`${styles.channel} ${active ? styles.active : ''} ${unread > 0 ? styles.unread : ''}`}>
      <button
        type="button"
        className={styles.channelButton}
        onClick={onSelect}
        disabled={locked}
        title={locked ? 'No tenés permiso para conectarte a este canal' : undefined}
        aria-label={
          locked
            ? `Canal ${channel.name}, sin permiso para conectarte`
            : `Canal ${channel.name}${unreadDescription ? `, ${unreadDescription}` : ''}`
        }
        aria-current={active ? 'page' : undefined}
      >
        •{channel.name}
        {locked && <Lock className={styles.lock} size={12} strokeWidth={1.5} aria-hidden="true" />}
        {channel.isPrivate && <span className={styles.channelMeta}> privado</span>}
        {inCall && <span className={styles.channelMeta}> en llamada/</span>}
        {channel.type === 'voice' && channel.userLimit ? (
          <span className={styles.channelMeta}>
            {' '}
            {participants.length}/{channel.userLimit}
          </span>
        ) : null}
        {unread > 0 && (
          // Con menciones se distingue: "@" y el contador de menciones
          <span className={`${styles.badge} ${mentions > 0 ? styles.mentionBadge : ''}`} aria-hidden="true">
            {mentions > 0 ? `@${formatUnreadCount(mentions)}` : formatUnreadCount(unread)}
          </span>
        )}
      </button>
      {onEdit && (
        <ActionLink className={styles.edit} onPress={onEdit} aria-label={`Editar ${channel.name}`}>
          editar
        </ActionLink>
      )}
    </div>
  );
}

interface MenuItem {
  label: string;
  onSelect?: () => void;
  detail?: string;
  /** Va separado por una línea (abandonar / eliminar). */
  separated?: boolean;
}

/** Menú del servidor: "menú v" arriba a la derecha; se cierra con Escape o con un clic afuera. */
function ServerMenu({ serverName, items }: { serverName: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={styles.menuWrap}>
      <button
        type="button"
        className={styles.menuToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menú del servidor ${serverName}`}
      >
        menú <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">v</span>
      </button>
      {open && (
        <ul className={styles.menu} role="menu" aria-label={`Menú del servidor ${serverName}`}>
          {items
            .filter((item) => item.onSelect)
            .map((item) => (
              <li key={item.label} role="none" className={item.separated ? styles.menuSeparated : undefined}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                >
                  {item.label}
                  {item.detail && <span className={styles.menuDetail}>{item.detail}</span>}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
