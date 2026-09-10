import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  MessageSquare,
  Phone,
  Video,
  Plus,
  X,
  Check,
  MoreHorizontal,
  UserX,
  Sparkles,
  Headphones,
  Code,
  Palette,
} from 'lucide-react';
import { DirectMessage, User } from '../types';
import { CURRENT_USER_ID, USERS, DIRECT_MESSAGES, DM_MESSAGES } from '../data/mock';
import { ChatView } from './ChatView';

/** Pestañas disponibles dentro de la sección de Amigos. */
export type FriendsTab = 'online' | 'all' | 'pending' | 'blocked' | 'add-friend';

/**
 * Propiedades del componente principal HomeView.
 */
export interface HomeViewProps {
  /** ID del usuario en sesión activa. */
  currentUserId?: string;
  /** Lista de mensajes directos recientes. */
  directMessages?: DirectMessage[];
  /** ID del mensaje directo activo. Si es null, se muestra la pestaña de Amigos. */
  activeDirectMessageId?: string | null;
  /** Callback al seleccionar un mensaje directo o volver a la vista de amigos (null). */
  onSelectDirectMessage?: (dmId: string | null) => void;
  /** Callback para abrir el perfil modal de un usuario. */
  onOpenUserProfile?: (userId: string) => void;
  /** Callback para iniciar llamada de audio con un usuario. */
  onStartVoiceCall?: (userId: string) => void;
  /** Callback para iniciar llamada de video con un usuario. */
  onStartVideoCall?: (userId: string) => void;
  /** Callback opcional al enviar mensaje en un DM. */
  onSendMessage?: (dmId: string, content: string) => void;
}

/**
 * Solicitud de amistad simulada para la pestaña Pending.
 */
interface FriendRequest {
  id: string;
  user: User;
  type: 'incoming' | 'outgoing';
}

/**
 * Vista de inicio de Discordia con panel de Mensajes Directos y vista de Amigos.
 */
export const HomeView: React.FC<HomeViewProps> = ({
  currentUserId = CURRENT_USER_ID,
  directMessages = DIRECT_MESSAGES,
  activeDirectMessageId: externalActiveDmId,
  onSelectDirectMessage,
  onOpenUserProfile,
  onStartVoiceCall,
  onStartVideoCall,
  onSendMessage,
}) => {
  // Estado local para DM seleccionado si no es controlado exteriormente
  const [internalActiveDmId, setInternalActiveDmId] = useState<string | null>(null);
  const activeDmId =
    externalActiveDmId !== undefined ? externalActiveDmId : internalActiveDmId;

  // Estado de pestañas de amigos
  const [activeTab, setActiveTab] = useState<FriendsTab>('online');
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [dmSearchQuery, setDmSearchQuery] = useState('');

  // Formulario "Añadir Amigo"
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendSuccess, setAddFriendSuccess] = useState<string | null>(null);

  // Lista local de solicitudes pendientes
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([
    {
      id: 'req-1',
      user: USERS.u6,
      type: 'incoming',
    },
  ]);

  // Lista de usuarios bloqueados simulados
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // Directorio de todos los amigos (excluyendo al usuario actual)
  const allFriends = useMemo(() => {
    return Object.values(USERS).filter((u) => u.id !== currentUserId);
  }, [currentUserId]);

  // Amigos conectados (status != offline)
  const onlineFriends = useMemo(() => {
    return allFriends.filter(
      (u) =>
        u.status !== 'offline' &&
        u.status !== 'invisible' &&
        !blockedUserIds.includes(u.id)
    );
  }, [allFriends, blockedUserIds]);

  // Filtrado de DMs en la barra lateral
  const filteredDms = useMemo(() => {
    if (!dmSearchQuery.trim()) return directMessages;
    const q = dmSearchQuery.toLowerCase();
    return directMessages.filter((dm) => {
      const name = dm.recipient?.displayName.toLowerCase() || '';
      const user = dm.recipient?.username.toLowerCase() || '';
      return name.includes(q) || user.includes(q);
    });
  }, [directMessages, dmSearchQuery]);

  // DM activo actual
  const activeDm = useMemo(() => {
    if (!activeDmId) return null;
    return directMessages.find((dm) => dm.id === activeDmId) || null;
  }, [activeDmId, directMessages]);

  const selectDm = (dmId: string | null) => {
    if (onSelectDirectMessage) {
      onSelectDirectMessage(dmId);
    } else {
      setInternalActiveDmId(dmId);
    }
  };

  const handleAcceptRequest = (reqId: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleDeclineRequest = (reqId: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleUnblock = (userId: string) => {
    setBlockedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleSendFriendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendInput.trim()) return;
    setAddFriendSuccess(`¡Éxito! Tu solicitud de amistad a ${addFriendInput} fue enviada.`);
    setAddFriendInput('');
    setTimeout(() => setAddFriendSuccess(null), 4000);
  };

  // Filtrado de amigos según pestaña y búsqueda
  const displayedFriends = useMemo(() => {
    let list: User[] = [];
    if (activeTab === 'online') {
      list = onlineFriends;
    } else if (activeTab === 'all') {
      list = allFriends.filter((u) => !blockedUserIds.includes(u.id));
    } else if (activeTab === 'blocked') {
      list = allFriends.filter((u) => blockedUserIds.includes(u.id));
    }

    if (!friendsSearchQuery.trim()) return list;
    const q = friendsSearchQuery.toLowerCase();
    return list.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [activeTab, onlineFriends, allFriends, blockedUserIds, friendsSearchQuery]);

  return (
    <div className="home-layout">
      {/* ==========================================================================
          1. SIDEBAR DE MENSAJES DIRECTOS (240px)
          ========================================================================== */}
      <aside className="dm-sidebar">
        {/* Campo de Búsqueda Superior */}
        <div style={{ padding: '10px 10px 8px 10px', borderBottom: '1px solid rgba(0, 0, 0, 0.2)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-xs)',
              padding: '6px 8px',
              gap: 8,
            }}
          >
            <input
              type="text"
              placeholder="Encuentra o inicia una conversación"
              value={dmSearchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDmSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-normal)',
                fontSize: 12,
                width: '100%',
              }}
            />
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </div>

        {/* Botón de Acceso a Amigos */}
        <div style={{ padding: '8px 8px 4px 8px' }}>
          <div
            className={`dm-item ${activeDmId === null ? 'active' : ''}`}
            onClick={() => selectDm(null)}
          >
            <Users size={20} style={{ color: activeDmId === null ? 'var(--interactive-active)' : 'inherit' }} />
            <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>Amigos</span>
            {onlineFriends.length > 0 && (
              <span className="badge badge-brand" style={{ fontSize: 10 }}>
                {onlineFriends.length}
              </span>
            )}
          </div>
        </div>

        {/* Cabecera de Mensajes Directos */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px 4px 16px',
            color: 'var(--text-muted)',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <span>MENSAJES DIRECTOS</span>
          <button
            className="btn-icon"
            style={{ width: 20, height: 20 }}
            title="Crear MD"
            onClick={() => setActiveTab('add-friend')}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Lista de Mensajes Directos Recientes */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }} className="scrollbar-thin">
          {filteredDms.map((dm) => {
            const recipient = dm.recipient || USERS[dm.recipientId];
            const isSelected = activeDmId === dm.id;

            return (
              <div
                key={dm.id}
                className={`dm-item ${isSelected ? 'active' : ''}`}
                onClick={() => selectDm(dm.id)}
              >
                {/* Avatar con punto de estado */}
                <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
                  <img
                    src={
                      recipient?.avatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                    }
                    alt={recipient?.displayName || 'User'}
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span
                    className={`status-dot ${recipient?.status || 'offline'}`}
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                    }}
                  />
                </div>

                {/* Info del DM: Nombre y último mensaje */}
                <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: isSelected ? 'var(--text-white)' : 'var(--text-normal)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {recipient?.displayName || 'User'}
                    </span>
                    {dm.unreadCount && dm.unreadCount > 0 ? (
                      <span className="badge badge-danger" style={{ fontSize: 10, padding: '1px 5px' }}>
                        {dm.unreadCount}
                      </span>
                    ) : null}
                  </div>

                  {dm.lastMessage && (
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 2,
                      }}
                    >
                      {dm.lastMessage}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ==========================================================================
          2. ÁREA PRINCIPAL: CHAT DE DM O VISTA DE AMIGOS
          ========================================================================== */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {activeDm ? (
          /* ========================================================================
             CASO A: DM SELECCIONADO (RENDERIZA ChatView)
             ======================================================================== */
          <ChatView
            directMessage={activeDm}
            messages={DM_MESSAGES[activeDm.id] || []}
            currentUserId={currentUserId}
            users={USERS}
            onOpenUserProfile={onOpenUserProfile}
            onStartVoiceCall={() => onStartVoiceCall?.(activeDm.recipientId)}
            onStartVideoCall={() => onStartVideoCall?.(activeDm.recipientId)}
            onSendMessage={(content) => onSendMessage?.(activeDm.id, content)}
          />
        ) : (
          /* ========================================================================
             CASO B: VISTA DE AMIGOS
             ======================================================================== */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-chat)' }}>
            {/* Cabecera de Amigos con Pestañas */}
            <header className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={24} style={{ color: 'var(--text-muted)' }} />
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--header-primary)' }}>
                    Amigos
                  </h2>
                </div>

                <div style={{ width: 1, height: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

                {/* Barra de Pestañas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setActiveTab('online')}
                    style={{
                      backgroundColor: activeTab === 'online' ? 'var(--bg-modifier-selected)' : 'transparent',
                      color: activeTab === 'online' ? 'var(--interactive-active)' : 'var(--interactive-normal)',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      padding: '4px 10px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Disponible ({onlineFriends.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('all')}
                    style={{
                      backgroundColor: activeTab === 'all' ? 'var(--bg-modifier-selected)' : 'transparent',
                      color: activeTab === 'all' ? 'var(--interactive-active)' : 'var(--interactive-normal)',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      padding: '4px 10px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Todos ({allFriends.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('pending')}
                    style={{
                      backgroundColor: activeTab === 'pending' ? 'var(--bg-modifier-selected)' : 'transparent',
                      color: activeTab === 'pending' ? 'var(--interactive-active)' : 'var(--interactive-normal)',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      padding: '4px 10px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>Pendiente</span>
                    {pendingRequests.length > 0 && (
                      <span className="badge badge-danger" style={{ fontSize: 10, padding: '1px 5px' }}>
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('blocked')}
                    style={{
                      backgroundColor: activeTab === 'blocked' ? 'var(--bg-modifier-selected)' : 'transparent',
                      color: activeTab === 'blocked' ? 'var(--interactive-active)' : 'var(--interactive-normal)',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      padding: '4px 10px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Bloqueado
                  </button>

                  <button
                    onClick={() => setActiveTab('add-friend')}
                    style={{
                      backgroundColor: activeTab === 'add-friend' ? 'transparent' : 'var(--success)',
                      color: activeTab === 'add-friend' ? 'var(--status-online)' : 'var(--text-white)',
                      border: activeTab === 'add-friend' ? '1px solid var(--status-online)' : 'none',
                      borderRadius: 'var(--radius-xs)',
                      padding: '4px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Añadir amigo
                  </button>
                </div>
              </div>
            </header>

            {/* Contenido Principal de Amigos y Panel Activo Ahora */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {/* Columna Izquierda: Listado de amigos o formulario */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflowY: 'auto' }}>
                {activeTab === 'add-friend' ? (
                  /* Formulario Añadir Amigo */
                  <div style={{ maxWidth: 540 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--header-primary)', marginBottom: 8 }}>
                      AÑADIR AMIGO
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                      Puedes añadir amigos usando su nombre de usuario de Discordia.
                    </p>

                    <form onSubmit={handleSendFriendRequest}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          border: '1px solid rgba(0, 0, 0, 0.3)',
                          gap: 12,
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Puedes añadir amigos con su Discordia Tag (ej. danielp)"
                          value={addFriendInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddFriendInput(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-normal)',
                            fontSize: 14,
                            flex: 1,
                          }}
                        />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={!addFriendInput.trim()}
                          style={{ padding: '8px 16px', fontSize: 13 }}
                        >
                          Enviar solicitud de amistad
                        </button>
                      </div>
                    </form>

                    {addFriendSuccess && (
                      <p style={{ color: 'var(--status-online)', fontSize: 13, marginTop: 12 }}>
                        {addFriendSuccess}
                      </p>
                    )}
                  </div>
                ) : activeTab === 'pending' ? (
                  /* Solicitudes de Amistad Pendientes */
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16 }}>
                      PENDIENTE — {pendingRequests.length}
                    </h3>
                    {pendingRequests.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
                        No hay solicitudes de amistad pendientes.
                      </p>
                    ) : (
                      pendingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="friend-row-hover"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <img
                              src={req.user.avatar}
                              alt={req.user.displayName}
                              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--header-primary)', fontSize: 14 }}>
                                {req.user.displayName}
                              </span>
                              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                Solicitud de amistad entrante
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onClick={() => handleAcceptRequest(req.id)}
                              title="Aceptar"
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--status-online)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(req.id)}
                              title="Rechazar"
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--danger)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Listado de Amigos (Online / All / Blocked) */
                  <div>
                    {/* Barra de Filtro de Amigos */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '8px 12px',
                        marginBottom: 20,
                        gap: 8,
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Buscar amigos"
                        value={friendsSearchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFriendsSearchQuery(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'var(--text-normal)',
                          fontSize: 13,
                          width: '100%',
                        }}
                      />
                      <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>

                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>
                      {activeTab === 'online'
                        ? `DISPONIBLE — ${displayedFriends.length}`
                        : activeTab === 'all'
                        ? `TODOS LOS AMIGOS — ${displayedFriends.length}`
                        : `BLOQUEADO — ${displayedFriends.length}`}
                    </h3>

                    {displayedFriends.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
                        No se encontraron amigos en esta categoría.
                      </p>
                    ) : (
                      displayedFriends.map((friend) => {
                        const existingDm = directMessages.find((dm) => dm.recipientId === friend.id);

                        return (
                          <div
                            key={friend.id}
                            className="friend-row-hover"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                            }}
                          >
                            {/* Información del Amigo */}
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}
                              onClick={() => onOpenUserProfile?.(friend.id)}
                            >
                              <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                                <img
                                  src={friend.avatar}
                                  alt={friend.displayName}
                                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <span
                                  className={`status-dot ${friend.status || 'offline'}`}
                                  style={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    width: 10,
                                    height: 10,
                                  }}
                                />
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 600, color: 'var(--header-primary)', fontSize: 14 }}>
                                    {friend.displayName}
                                  </span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                    @{friend.username}
                                  </span>
                                  {friend.isPremium && (
                                    <Sparkles size={13} style={{ color: 'var(--text-warning)' }} />
                                  )}
                                </div>
                                <p
                                  style={{
                                    fontSize: 12,
                                    color: 'var(--text-muted)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginTop: 2,
                                  }}
                                >
                                  {friend.customStatus ||
                                    (friend.status === 'online' ? 'Disponible' : 'Desconectado')}
                                </p>
                              </div>
                            </div>

                            {/* Botones de Acción Rápida */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {activeTab === 'blocked' ? (
                                <button
                                  onClick={() => handleUnblock(friend.id)}
                                  className="btn btn-secondary"
                                  style={{ fontSize: 12, padding: '4px 10px' }}
                                >
                                  <UserX size={14} />
                                  <span>Desbloquear</span>
                                </button>
                              ) : (
                                <>
                                  {/* Botón Iniciar DM */}
                                  <button
                                    onClick={() => {
                                      if (existingDm) {
                                        selectDm(existingDm.id);
                                      } else {
                                        selectDm(`dm-${friend.id}`);
                                      }
                                    }}
                                    title="Enviar mensaje"
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: '50%',
                                      backgroundColor: 'var(--bg-secondary)',
                                      color: 'var(--interactive-normal)',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <MessageSquare size={18} />
                                  </button>

                                  {/* Botón Iniciar Llamada */}
                                  <button
                                    onClick={() => onStartVoiceCall?.(friend.id)}
                                    title="Iniciar llamada"
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: '50%',
                                      backgroundColor: 'var(--bg-secondary)',
                                      color: 'var(--interactive-normal)',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Phone size={18} />
                                  </button>

                                  {/* Botón Iniciar Videollamada */}
                                  <button
                                    onClick={() => onStartVideoCall?.(friend.id)}
                                    title="Iniciar videollamada"
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: '50%',
                                      backgroundColor: 'var(--bg-secondary)',
                                      color: 'var(--interactive-normal)',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Video size={18} />
                                  </button>

                                  {/* Más Opciones */}
                                  <button
                                    onClick={() => onOpenUserProfile?.(friend.id)}
                                    title="Más opciones"
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: '50%',
                                      backgroundColor: 'var(--bg-secondary)',
                                      color: 'var(--interactive-normal)',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <MoreHorizontal size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Columna Derecha: Panel "Activo Ahora" */}
              <aside
                style={{
                  width: 340,
                  borderLeft: '1px solid rgba(0, 0, 0, 0.2)',
                  padding: 20,
                  overflowY: 'auto',
                }}
              >
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--header-primary)', marginBottom: 16 }}>
                  Activo ahora
                </h3>

                {/* Tarjetas de Actividad de Amigos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Tarjeta 1: Spotify */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <img
                        src={USERS.u1.avatar}
                        alt="Sofia"
                        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--header-primary)' }}>
                          Sofia Rossi
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Escuchando Spotify</div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--status-online)',
                      }}
                    >
                      <Headphones size={16} />
                      <span style={{ fontWeight: 500 }}>Daft Punk - Instant Crush</span>
                    </div>
                  </div>

                  {/* Tarjeta 2: Coding */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <img
                        src={USERS.u2.avatar}
                        alt="Martín"
                        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--header-primary)' }}>
                          Martín Méndez
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          En Visual Studio Code
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--brand)',
                      }}
                    >
                      <Code size={16} />
                      <span style={{ fontWeight: 500 }}>RabbitMQ Topic Exchange Consumer</span>
                    </div>
                  </div>

                  {/* Tarjeta 3: Figma */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <img
                        src={USERS.u3.avatar}
                        alt="Emma"
                        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--header-primary)' }}>
                          Emma Watson
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Diseñando en Figma</div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--text-warning)',
                      }}
                    >
                      <Palette size={16} />
                      <span style={{ fontWeight: 500 }}>Discordia Dark UI Design System</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
