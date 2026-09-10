import React, { useState, useEffect, useRef } from 'react';
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
  VolumeX,
  Gem,
} from 'lucide-react';
import { Server, Channel, User, Status } from '../types';
import { Avatar } from './Avatar';
import { UserPanel } from './UserPanel';

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
  /** Acción para unirse a un canal de voz al hacer clic. */
  onJoinVoiceChannel?: (channelId: string) => void;
  /** Acción para crear un nuevo canal en una categoría. */
  onCreateChannel?: (categoryId?: string) => void;
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
  isVoiceConnected,
  activeVoiceChannelId,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onDisconnectVoice,
  voiceParticipants = {},
  onJoinVoiceChannel,
  onCreateChannel,
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
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const headerRef = useRef<HTMLDivElement>(null);

  const isOwner = server.ownerId === currentUser.id;

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
      <div ref={headerRef} style={{ position: 'relative' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--header-primary, #f2f3f5)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f47fff' }}>
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={16} />
                <span>Ajustes del servidor</span>
              </span>
            </div>

            {/* Notificaciones */}
            <div
              className="context-menu-item"
              onClick={() => {
                setIsServerMenuOpen(false);
                onOpenNotificationSettings?.();
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          style={{
            margin: '8px 8px 0 8px',
            padding: '6px 10px',
            background:
              'linear-gradient(135deg, rgba(244, 127, 255, 0.15) 0%, rgba(255, 115, 250, 0.05) 100%)',
            border: '1px solid rgba(244, 127, 255, 0.3)',
            borderRadius: 'var(--radius-sm, 4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'background-color 150ms ease',
          }}
          title="Ver ventajas y estado de Boost"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#f47fff" />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#f47fff',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Nivel {server.boostLevel}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #949ba4)' }}>
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
        {server.categories.map((category) => {
          const isCollapsed = Boolean(collapsedCategories[category.id]);

          return (
            <div key={category.id} style={{ marginBottom: '8px' }}>
              {/* Encabezado de la Categoría */}
              <div
                className="category-header"
                onClick={() => toggleCategory(category.id)}
                role="button"
                tabIndex={0}
                aria-expanded={!isCollapsed}
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
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                    }}
                    title="Crear canal en esta categoría"
                    aria-label={`Crear canal en ${category.name}`}
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              {/* Canales de la categoría */}
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {category.channels.map((channel) => {
                    const isActive = channel.id === activeChannelId;
                    const isVoiceActive = channel.id === activeVoiceChannelId && isVoiceConnected;
                    const hasUnreads = Boolean(channel.unreadCount && channel.unreadCount > 0);
                    const participants = voiceParticipants[channel.id] || [];

                    return (
                      <div key={channel.id}>
                        <div
                          className={`channel-item ${isActive ? 'active' : ''} ${
                            hasUnreads ? 'unread' : ''
                          }`}
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

                          {/* Badges de no leído o límite de participantes */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {channel.userLimit && channel.type === 'voice' && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-muted, #949ba4)',
                                }}
                              >
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
                          <div
                            style={{
                              paddingLeft: '32px',
                              paddingRight: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              marginTop: '2px',
                              marginBottom: '4px',
                            }}
                          >
                            {participants.map((p) => {
                              const isParticipantSpeaking = Boolean(p.isSpeaking);

                              return (
                                <div
                                  key={p.user.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '3px 6px',
                                    borderRadius: 'var(--radius-xs, 3px)',
                                    backgroundColor: isVoiceActive
                                      ? 'rgba(255, 255, 255, 0.03)'
                                      : 'transparent',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      minWidth: 0,
                                    }}
                                  >
                                    <Avatar
                                      user={p.user}
                                      size={22}
                                      speaking={isParticipantSpeaking}
                                    />
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: isParticipantSpeaking
                                          ? 'var(--status-online, #23a55a)'
                                          : 'var(--text-normal, #dbdee1)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {p.user.displayName || p.user.username}
                                    </span>
                                  </div>

                                  {/* Indicadores de audio del participante */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      color: 'var(--text-muted, #949ba4)',
                                    }}
                                  >
                                    {p.isMuted && <MicOff size={13} color="var(--danger, #da373c)" />}
                                    {p.isDeafened && <VolumeX size={13} color="var(--danger, #da373c)" />}
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
        })}
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
    </aside>
  );
};

export default ChannelSidebar;
