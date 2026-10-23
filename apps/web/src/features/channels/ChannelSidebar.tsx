import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Hash,
  Volume2,
  Megaphone,
  Lock,
  Plus,
  ChevronDown,
  Sparkles,
  UserPlus,
  Settings,
  Bell,
  Shield,
  UserCheck,
  EyeOff,
  LogOut,
  Trash2,
  MicOff,
  HeadphoneOff,
  VolumeX,
  Gem,
  FolderPlus,
} from 'lucide-react';
import { Server, Channel, User, Status } from '../../types';
import { isLocalCategoryId } from '@discordia/core';
import { Avatar } from '../../ui/legacy/Avatar';
import { VoiceParticipantMenu } from '../voice/VoiceParticipantMenu';
import { UserPanel } from '../profile/UserPanel';
import styles from './ChannelSidebar.module.css';

/** Participante conectado a una sala de voz. */
export interface VoiceParticipant {
  /** Objeto de usuario conectado. */
  user: User;
  /** Indica si el usuario está emitiendo voz activamente. */
  isSpeaking?: boolean;
  /** Indica si tiene su micrófono silenciado. */
  isMuted?: boolean;
  /** Indica si tiene ensordecido su audio. */
  isDeafened?: boolean;
}

/**
 * Propiedades del componente ChannelSidebar.
 */
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
  /** Estado de silencio del micrófono del usuario actual. */
  isMuted: boolean;
  /** Estado de ensordecimiento de audio del usuario actual. */
  isDeafened: boolean;
  /** Alterna el micrófono. */
  onToggleMute: () => void;
  /** Alterna el ensordecimiento de audio. */
  onToggleDeafen: () => void;
  /** Abre ajustes de usuario. */
  onOpenSettings: () => void;
  /** Desconecta la sala de voz activa. */
  onDisconnectVoice: () => void;
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
  onDeleteChannel?: (channelId: string) => void;
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
  onDeleteServer?: () => void;
  /** Callbacks adicionales del UserPanel */
  onChangeStatus?: (status: Status) => void;
  onSaveCustomStatus?: (customStatus: string) => void;
  onEditProfile?: () => void;
  onBuyPoints?: () => void;
  onSubscribePremium?: () => void;
  onLogout?: () => void;
}

/**
 * Renderiza el icono semántico correspondiente al tipo de canal.
 *
 * @param channel - Canal a evaluar.
 * @returns Elemento JSX con el icono apropiado.
 */
function renderChannelIcon(channel: Channel): React.ReactElement {
  if (channel.isPrivate) {
    return <Lock size={18} className="channel-prefix" />;
  }
  switch (channel.type) {
    case 'voice':
      return <Volume2 size={18} className="channel-prefix" />;
    case 'announcement':
      return <Megaphone size={18} className="channel-prefix" />;
    case 'text':
    default:
      return <Hash size={18} className="channel-prefix" />;
  }
}

/**
 * Barra lateral de canales del servidor (Nivel 2).
 * Incluye cabecera con menú contextual desplegable, indicador de nivel de boost,
 * categorías colapsables con chevron animado, canales con badges/unreads,
 * participantes de voz en vivo y el panel de usuario anclado en la base.
 */
export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  server,
  activeChannelId,
  onSelectChannel,
  currentUser,
  isLoading = false,
  isVoiceConnected,
  activeVoiceChannelId,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onDisconnectVoice,
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
  onChangeStatus,
  onSaveCustomStatus,
  onEditProfile,
  onBuyPoints,
  onSubscribePremium,
  onLogout,
}) => {
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const headerRef = useRef<HTMLDivElement>(null);

  const isOwner = server.ownerId === currentUser.id;

  const [participantMenu, setParticipantMenu] = useState<{ user: User; x: number; y: number } | null>(null);
  const closeParticipantMenu = useCallback(() => setParticipantMenu(null), []);

  // Cierra menú contextual del servidor con click exterior y Escape
  useEffect(() => {
    if (!isServerMenuOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsServerMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsServerMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isServerMenuOpen]);

  /* ---------- Reorden por arrastre (drag & drop nativo de HTML5) ---------- */
  type DragItem = { kind: 'channel' | 'category'; id: string };
  type DropTarget = { kind: 'channel' | 'category'; id: string; position: 'before' | 'after' };
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const startDrag = (e: React.DragEvent, item: DragItem) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id); // requerido por Firefox para iniciar el arrastre
    setDragItem(item);
  };

  const endDrag = () => {
    setDragItem(null);
    setDropTarget(null);
  };

  /** Un canal se puede soltar sobre otro canal o sobre una categoría; una categoría, solo sobre otra real. */
  const canDropOn = (kind: DropTarget['kind'], id: string) => {
    if (!dragItem || dragItem.id === id) return false;
    if (dragItem.kind === 'channel') return true;
    return kind === 'category' && !isLocalCategoryId(id);
  };

  const handleDragOver = (e: React.DragEvent, kind: DropTarget['kind'], id: string) => {
    if (!canDropOn(kind, id)) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    if (dropTarget?.kind !== kind || dropTarget.id !== id || dropTarget.position !== position) {
      setDropTarget({ kind, id, position });
    }
  };

  /** Traduce el destino del arrastre a "antes de qué elemento" va lo arrastrado. */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItem && dropTarget) {
      if (dragItem.kind === 'channel') {
        if (dropTarget.kind === 'category') {
          // Sobre el encabezado: al principio de esa categoría
          const target = server.categories.find((c) => c.id === dropTarget.id);
          const first = target?.channels.find((ch) => ch.id !== dragItem.id);
          onMoveChannel?.(dragItem.id, dropTarget.id, first?.id ?? null);
        } else {
          const target = server.categories.find((c) => c.channels.some((ch) => ch.id === dropTarget.id));
          if (target) {
            const siblings = target.channels.filter((ch) => ch.id !== dragItem.id);
            const index = siblings.findIndex((ch) => ch.id === dropTarget.id);
            const before = dropTarget.position === 'before' ? siblings[index] : siblings[index + 1];
            onMoveChannel?.(dragItem.id, target.id, before?.id ?? null);
          }
        }
      } else {
        const siblings = server.categories.filter((c) => !isLocalCategoryId(c.id) && c.id !== dragItem.id);
        const index = siblings.findIndex((c) => c.id === dropTarget.id);
        const before = dropTarget.position === 'before' ? siblings[index] : siblings[index + 1];
        onMoveCategory?.(dragItem.id, before?.id ?? null);
      }
    }
    endDrag();
  };

  /** Línea que indica dónde va a quedar lo arrastrado. */
  const dropIndicator = (kind: DropTarget['kind'], id: string): React.CSSProperties | undefined => {
    if (dropTarget?.kind !== kind || dropTarget.id !== id) return undefined;
    if (kind === 'category' && dragItem?.kind === 'channel') {
      return { backgroundColor: 'var(--bg-modifier-hover, rgba(78, 80, 88, 0.3))', borderRadius: '4px' };
    }
    const edge = dropTarget.position === 'before' ? 'inset 0 2px 0 0' : 'inset 0 -2px 0 0';
    return { boxShadow: `${edge} var(--brand, #5865f2)` };
  };

  /** Alterna el colapso de una categoría específica. */
  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  /** Resuelve el nombre del canal de voz activo si existe. */
  let activeVoiceChannelName: string | undefined;
  if (activeVoiceChannelId) {
    for (const cat of server.categories) {
      const found = cat.channels.find((c) => c.id === activeVoiceChannelId);
      if (found) {
        activeVoiceChannelName = found.name;
        break;
      }
    }
  }

  return (
    <aside
      className="channel-sidebar"
      style={{
        width: 'var(--channel-sidebar-width, 240px)',
        height: '100%',
        backgroundColor: 'var(--bg-secondary, #2b2d31)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Cabecera del servidor */}
      <div ref={headerRef} className={styles.cabeceraServidor}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
          style={{
            height: 'var(--header-height, 48px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
            boxShadow: isServerMenuOpen ? 'none' : 'var(--shadow-sm)',
            cursor: 'pointer',
            backgroundColor: isServerMenuOpen
              ? 'var(--bg-modifier-selected, rgba(255, 255, 255, 0.1))'
              : 'transparent',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!isServerMenuOpen) {
              e.currentTarget.style.backgroundColor =
                'var(--bg-modifier-hover, rgba(255, 255, 255, 0.06))';
            }
          }}
          onMouseLeave={(e) => {
            if (!isServerMenuOpen) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          aria-expanded={isServerMenuOpen}
          aria-haspopup="menu"
        >
          <div className={styles.cabeceraServidorDiv}>
            <h2 className={styles.cabeceraServidorDivH2}>
              {server.name}
            </h2>
            {server.boostLevel > 0 && (
              <span title={`Servidor Nivel ${server.boostLevel} de Boost`}>
                <Gem size={15} color="#f47fff" />
              </span>
            )}
          </div>

          <ChevronDown
            size={18}
            color="var(--interactive-normal, #b5bac1)"
            style={{
              transform: isServerMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
              flexShrink: 0,
            }}
          />
        </div>

        {/* Menú Desplegable del Servidor */}
        {isServerMenuOpen && (
          <div
            className="context-menu animate-fade-in"
            style={{
              top: '52px',
              left: '8px',
              right: '8px',
              width: 'calc(100% - 16px)',
              position: 'absolute',
              zIndex: 9999,
            }}
          >
            {/* Opción Boost */}
            <div
              className="context-menu-item"
              onClick={() => {
                setIsServerMenuOpen(false);
                onOpenServerBoost?.();
              }}
            >
              <span className={styles.opcionBoostSpan}>
                <Sparkles size={16} />
                <span>Mejora del servidor</span>
              </span>
              <span
                className="badge badge-boost"
                style={{ fontSize: '10px', padding: '1px 5px' }}
              >
                Nivel {server.boostLevel}
              </span>
            </div>

            <div className="context-menu-separator" />

            {/* Invitar personas */}
            <div
              className="context-menu-item"
              style={{ color: 'var(--brand, #5865f2)' }}
              onClick={() => {
                setIsServerMenuOpen(false);
                onInvitePeople?.();
              }}
            >
              <span className={styles.invitarPersonasSpan}>
                <UserPlus size={16} />
                <span>Invitar personas</span>
              </span>
            </div>

            {/* Ajustes del servidor */}
            <div
              className="context-menu-item"
              onClick={() => {
                setIsServerMenuOpen(false);
                onOpenServerSettings?.();
              }}
            >
              <span className={styles.invitarPersonasSpan}>
                <Settings size={16} />
                <span>Ajustes del servidor</span>
              </span>
            </div>

            {/* Crear canal */}
            {onCreateChannel && (
              <div
                className="context-menu-item"
                onClick={() => {
                  setIsServerMenuOpen(false);
                  onCreateChannel();
                }}
              >
                <span className={styles.invitarPersonasSpan}>
                  <Plus size={16} />
                  <span>Crear canal</span>
                </span>
              </div>
            )}

            {/* Crear categoría */}
            {onCreateCategory && (
              <div
                className="context-menu-item"
                onClick={() => {
                  setIsServerMenuOpen(false);
                  onCreateCategory();
                }}
              >
                <span className={styles.invitarPersonasSpan}>
                  <FolderPlus size={16} />
                  <span>Crear categoría</span>
                </span>
              </div>
            )}

            {/* Notificaciones */}
            <div
              className="context-menu-item"
              onClick={() => {
                setIsServerMenuOpen(false);
                onOpenNotificationSettings?.();
              }}
            >
              <span className={styles.invitarPersonasSpan}>
                <Bell size={16} />
                <span>Ajustes de notificaciones</span>
              </span>
            </div>

            {/* Privacidad */}
            <div
              className="context-menu-item"
              onClick={() => {
                setIsServerMenuOpen(false);
                onOpenPrivacySettings?.();
              }}
            >
              <span className={styles.invitarPersonasSpan}>
                <Shield size={16} />
                <span>Ajustes de privacidad</span>
              </span>
            </div>

            {/* Perfil del servidor */}
            <div
              className="context-menu-item"
              onClick={() => {
                setIsServerMenuOpen(false);
                onOpenServerProfile?.();
              }}
            >
              <span className={styles.invitarPersonasSpan}>
                <UserCheck size={16} />
                <span>Editar perfil del servidor</span>
              </span>
            </div>

            <div className="context-menu-separator" />

            {/* Ocultar canales silenciados */}
            <div
              className="context-menu-item"
              onClick={() => {
                setIsServerMenuOpen(false);
                onToggleHideMutedChannels?.();
              }}
            >
              <span className={styles.invitarPersonasSpan}>
                <EyeOff size={16} />
                <span>Ocultar canales silenciados</span>
              </span>
            </div>

            <div className="context-menu-separator" />

            {/* Abandonar / Eliminar servidor */}
            {isOwner ? (
              <div
                className="context-menu-item danger"
                onClick={() => {
                  setIsServerMenuOpen(false);
                  onDeleteServer?.();
                }}
              >
                <span className={styles.invitarPersonasSpan}>
                  <Trash2 size={16} />
                  <span>Eliminar servidor</span>
                </span>
              </div>
            ) : (
              <div
                className="context-menu-item danger"
                onClick={() => {
                  setIsServerMenuOpen(false);
                  onLeaveServer?.();
                }}
              >
                <span className={styles.invitarPersonasSpan}>
                  <LogOut size={16} />
                  <span>Abandonar servidor</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de Nivel de Boost */}
      {server.boostLevel > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenServerBoost}
          className={styles.verVentajasEstadoBoost}
          title="Ver ventajas y estado de Boost"
        >
          <div className={styles.verVentajasEstadoBoostDiv}>
            <Sparkles size={14} color="#f47fff" />
            <span className={styles.verVentajasEstadoBoostDivSpan}>
              Nivel {server.boostLevel}
            </span>
          </div>
          <span className={styles.verVentajasEstadoBoostSpan}>
            {server.boostCount} mejoras
          </span>
        </div>
      )}

      {/* Lista de Categorías y Canales con scroll */}
      <div
        className="channel-list scrollbar-thin"
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '6px',
          paddingBottom: '8px',
        }}
      >
        {isLoading ? (
          <div className={styles.listaCategoriasCanalesScrollDiv}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.listaCategoriasCanalesScrollDivDiv}>
                <div className={styles.listaCategoriasCanalesScrollDivDivDiv} />
                <div className={styles.listaCategoriasCanalesScrollDivDivDiv2} />
                <div className={styles.listaCategoriasCanalesScrollDivDivDiv3} />
              </div>
            ))}
          </div>
        ) : (
          server.categories.map((category) => {
            const isCollapsed = Boolean(collapsedCategories[category.id]);

            return (
              <div key={category.id} className={styles.listaCategoriasCanalesScrollDiv2}>
                {/* Encabezado de la Categoría */}
                <div
                  className="category-header"
                  onClick={() => toggleCategory(category.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={!isCollapsed}
                  draggable={Boolean(onMoveCategory) && !isLocalCategoryId(category.id)}
                  onDragStart={(e) => startDrag(e, { kind: 'category', id: category.id })}
                  onDragEnd={endDrag}
                  onDragOver={(e) => handleDragOver(e, 'category', category.id)}
                  onDrop={handleDrop}
                  style={dropIndicator('category', category.id)}
                >
                  <div className="category-title">
                    <ChevronDown
                      size={13}
                      style={{
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms ease',
                        flexShrink: 0,
                      }}
                    />
                    <span>{category.name}</span>
                  </div>

                  {onCreateChannel && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateChannel(category.id);
                      }}
                      className={styles.crearCanalEstaCategoria}
                      title="Crear canal en esta categoría"
                      aria-label={`Crear canal en ${category.name}`}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>

                {/* Canales de la categoría */}
                {!isCollapsed && (
                  <div className={styles.listaCategoriasCanalesScrollDiv2Div}>
                    {category.channels.map((channel) => {
                      const isActive = channel.id === activeChannelId;
                      const isVoiceActive = channel.id === activeVoiceChannelId && isVoiceConnected;
                      const hasUnreads = Boolean(channel.unreadCount && channel.unreadCount > 0);
                      const participants = voiceParticipants[channel.id] || [];

                      return (
                        <div key={channel.id}>
                          <div
                            className={`channel-item ${isActive ? 'active' : ''} ${hasUnreads ? 'unread' : ''
                              }`}
                            draggable={Boolean(onMoveChannel)}
                            onDragStart={(e) => startDrag(e, { kind: 'channel', id: channel.id })}
                            onDragEnd={endDrag}
                            onDragOver={(e) => handleDragOver(e, 'channel', channel.id)}
                            onDrop={handleDrop}
                            style={dropIndicator('channel', channel.id)}
                            onMouseEnter={() => setHoveredChannelId(channel.id)}
                            onMouseLeave={() => setHoveredChannelId(null)}
                            onClick={() => {
                              onSelectChannel(channel.id);
                              if (channel.type === 'voice' && onJoinVoiceChannel) {
                                onJoinVoiceChannel(channel.id);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`Canal ${channel.name}`}
                          >
                            <div className="channel-item-left">
                              {renderChannelIcon(channel)}
                              <span className="channel-name">{channel.name}</span>
                            </div>
                            {hoveredChannelId === channel.id && onEditChannel && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditChannel(channel);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 'var(--radius-sm)',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-normal)'}
                                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                              >
                                <Settings size={14} />
                              </button>
                            )}

                            {/* Badges de no leído o límite de participantes */}
                            <div className={styles.badgesNoLeidoLimite}>
                              {channel.userLimit && channel.type === 'voice' && (
                                <span className={styles.verVentajasEstadoBoostSpan}>
                                  {participants.length}/{channel.userLimit}
                                </span>
                              )}

                              {hasUnreads && (
                                <span
                                  className="badge badge-danger"
                                  style={{
                                    padding: '1px 5px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '10px',
                                  }}
                                >
                                  {channel.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Lista de participantes de voz en vivo dentro del canal */}
                          {channel.type === 'voice' && participants.length > 0 && (
                            <div className={styles.listaCategoriasCanalesScrollDiv2DivDiv}>
                              {participants.map((p) => {
                                const isParticipantSpeaking = Boolean(p.isSpeaking);
                                const isOtherUser = p.user.id !== currentUser.id;
                                const isLocallyMuted = isOtherUser && Boolean(locallyMutedUsers[p.user.id]);

                                return (
                                  <div
                                    key={p.user.id}
                                    onContextMenu={(e) => {
                                      if (!isOtherUser || !onToggleLocalMute) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setParticipantMenu({ user: p.user, x: e.clientX, y: e.clientY });
                                    }}
                                    className={styles.listaCategoriasCanalesScrollDiv2DivDivDiv} style={{ backgroundColor: isVoiceActive
                                        ? 'rgba(255, 255, 255, 0.03)'
                                        : 'transparent' }}
                                  >
                                    <div className={styles.cabeceraServidorDiv}>
                                      <Avatar
                                        user={p.user}
                                        size={22}
                                        speaking={isParticipantSpeaking}
                                      />
                                      <span
                                        className={styles.cabeceraServidorDivSpan} style={{ color: isParticipantSpeaking
                                            ? 'var(--status-online, #23a55a)'
                                            : 'var(--text-normal, #dbdee1)' }}
                                      >
                                        {p.user.displayName || p.user.username}
                                      </span>
                                    </div>

                                    {/* Indicadores de audio del participante */}
                                    <div className={styles.indicadoresAudioParticipante}>
                                      {p.isMuted && (
                                        <span title="Micrófono silenciado" className={styles.microfonoSilenciado}>
                                          <MicOff size={13} color="var(--danger, #da373c)" />
                                        </span>
                                      )}
                                      {p.isDeafened && (
                                        <span title="Ensordecido" className={styles.microfonoSilenciado}>
                                          <HeadphoneOff size={13} color="var(--danger, #da373c)" />
                                        </span>
                                      )}
                                      {isLocallyMuted && (
                                        <span title="Silenciado para vos" className={styles.microfonoSilenciado}>
                                          <VolumeX size={13} color="var(--danger, #da373c)" />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Panel inferior del usuario integrado */}
      <UserPanel
        currentUser={currentUser}
        isMuted={isMuted}
        isDeafened={isDeafened}
        onToggleMute={onToggleMute}
        onToggleDeafen={onToggleDeafen}
        onOpenSettings={onOpenSettings}
        inVoiceChannel={isVoiceConnected}
        voiceChannelName={activeVoiceChannelName}
        voiceServerName={server.name}
        onDisconnectVoice={onDisconnectVoice}
        onChangeStatus={onChangeStatus}
        onSaveCustomStatus={onSaveCustomStatus}
        onEditProfile={onEditProfile}
        onBuyPoints={onBuyPoints}
        onSubscribePremium={onSubscribePremium}
        onLogout={onLogout}
      />

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
    </aside>
  );
};

export default ChannelSidebar;
