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
  Sparkles
} from 'lucide-react';
import { DirectMessage, User } from '../../types';
import { Avatar } from '../../ui/legacy/Avatar';

import { ChatView } from '../chat/ChatView';
import styles from './HomeView.module.css';

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
  /** Panel del usuario (perfil y controles de audio) anclado al pie del sidebar de mensajes directos. */
  userPanel?: React.ReactNode;
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
  currentUserId,
  directMessages = [],
  activeDirectMessageId: externalActiveDmId,
  onSelectDirectMessage,
  onOpenUserProfile,
  onStartVoiceCall,
  onStartVideoCall,
  onSendMessage,
  userPanel,
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
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

  // Lista de usuarios bloqueados simulados
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // Directorio de todos los amigos (excluyendo al usuario actual)
  const allFriends = useMemo(() => {
    return ([] as User[]).filter((u) => u.id !== currentUserId);
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
        <div className={styles.campoBusquedaSuperior}>
          <div className={styles.campoBusquedaSuperiorDiv}>
            <input
              type="text"
              placeholder="Encuentra o inicia una conversación"
              value={dmSearchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDmSearchQuery(e.target.value)}
              className={styles.encuentraIniciaUnaConversacion}
            />
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </div>

        {/* Botón de Acceso a Amigos */}
        <div className={styles.botonAccesoAmigos}>
          <div
            className={`dm-item ${activeDmId === null ? 'active' : ''}`}
            onClick={() => selectDm(null)}
          >
            <Users size={20} style={{ color: activeDmId === null ? 'var(--interactive-active)' : 'inherit' }} />
            <span className={styles.amigos}>Amigos</span>
            {onlineFriends.length > 0 && (
              <span className="badge badge-brand" style={{ fontSize: 10 }}>
                {onlineFriends.length}
              </span>
            )}
          </div>
        </div>

        {/* Cabecera de Mensajes Directos */}
        <div className={styles.cabeceraMensajesDirectos}>
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
            const recipient = dm.recipient || { id: dm.recipientId || 'unknown', name: 'Usuario', displayName: 'Usuario' } as any;
            const isSelected = activeDmId === dm.id;

            return (
              <div
                key={dm.id}
                className={`dm-item ${isSelected ? 'active' : ''}`}
                onClick={() => selectDm(dm.id)}
              >
                {/* Avatar con punto de estado */}
                <div className={styles.avatarPuntoEstado}>
                  <Avatar user={recipient || { id: "unknown", displayName: "Usuario" } as any} size={32} />
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
                <div className={styles.infoDmNombreUltimo}>
                  <div className={styles.infoDmNombreUltimoDiv}>
                    <span
                      className={styles.infoDmNombreUltimoDivSpan} style={{ color: isSelected ? 'var(--text-white)' : 'var(--text-normal)' }}
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
                    <p className={styles.infoDmNombreUltimoP}>
                      {dm.lastMessage}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {userPanel}
      </aside>

      {/* ==========================================================================
          2. ÁREA PRINCIPAL: CHAT DE DM O VISTA DE AMIGOS
          ========================================================================== */}
      <main className={styles.main}>
        {activeDm ? (
          /* ========================================================================
             CASO A: DM SELECCIONADO (RENDERIZA ChatView)
             ======================================================================== */
          <ChatView
            directMessage={activeDm}
            messages={[]}
            currentUserId={currentUserId}
            users={{}}
            onOpenUserProfile={onOpenUserProfile}
            onStartVoiceCall={() => onStartVoiceCall?.(activeDm.recipientId)}
            onStartVideoCall={() => onStartVideoCall?.(activeDm.recipientId)}
            onSendMessage={(content) => onSendMessage?.(activeDm.id, content)}
          />
        ) : (
          /* ========================================================================
             CASO B: VISTA DE AMIGOS
             ======================================================================== */
          <div className={styles.div}>
            {/* Cabecera de Amigos con Pestañas */}
            <header className="chat-header">
              <div className={styles.cabeceraAmigosPestanasDiv}>
                <div className={styles.cabeceraAmigosPestanasDivDiv}>
                  <Users size={24} style={{ color: 'var(--text-muted)' }} />
                  <h2 className={styles.amigos2}>
                    Amigos
                  </h2>
                </div>

                <div className={styles.cabeceraAmigosPestanasDivDiv2} />

                {/* Barra de Pestañas */}
                <div className={styles.cabeceraAmigosPestanasDivDiv}>
                  <button
                    onClick={() => setActiveTab('online')}
                    className={styles.cabeceraAmigosPestanasDivDivButton} style={{ backgroundColor: activeTab === 'online' ? 'var(--bg-modifier-selected)' : 'transparent', color: activeTab === 'online' ? 'var(--interactive-active)' : 'var(--interactive-normal)' }}
                  >
                    Disponible ({onlineFriends.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('all')}
                    className={styles.cabeceraAmigosPestanasDivDivButton} style={{ backgroundColor: activeTab === 'all' ? 'var(--bg-modifier-selected)' : 'transparent', color: activeTab === 'all' ? 'var(--interactive-active)' : 'var(--interactive-normal)' }}
                  >
                    Todos ({allFriends.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('pending')}
                    className={styles.cabeceraAmigosPestanasDivDivButton2} style={{ backgroundColor: activeTab === 'pending' ? 'var(--bg-modifier-selected)' : 'transparent', color: activeTab === 'pending' ? 'var(--interactive-active)' : 'var(--interactive-normal)' }}
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
                    className={styles.cabeceraAmigosPestanasDivDivButton} style={{ backgroundColor: activeTab === 'blocked' ? 'var(--bg-modifier-selected)' : 'transparent', color: activeTab === 'blocked' ? 'var(--interactive-active)' : 'var(--interactive-normal)' }}
                  >
                    Bloqueado
                  </button>

                  <button
                    onClick={() => setActiveTab('add-friend')}
                    className={styles.anadirAmigo} style={{ backgroundColor: activeTab === 'add-friend' ? 'transparent' : 'var(--success)', color: activeTab === 'add-friend' ? 'var(--status-online)' : 'var(--text-white)', border: activeTab === 'add-friend' ? '1px solid var(--status-online)' : 'none', borderRadius: 'var(--radius-xs)' }}
                  >
                    Añadir amigo
                  </button>
                </div>
              </div>
            </header>

            {/* Contenido Principal de Amigos y Panel Activo Ahora */}
            <div className={styles.contenidoPrincipalAmigosPanel}>
              {/* Columna Izquierda: Listado de amigos o formulario */}
              <div className={styles.columnaIzquierdaListadoAmigos}>
                {activeTab === 'add-friend' ? (
                  /* Formulario Añadir Amigo */
                  <div className={styles.columnaIzquierdaListadoAmigosDiv}>
                    <h3 className={styles.anadirAmigo2}>
                      AÑADIR AMIGO
                    </h3>
                    <p className={styles.columnaIzquierdaListadoAmigosDivP}>
                      Puedes añadir amigos usando su nombre de usuario de Discordia.
                    </p>

                    <form onSubmit={handleSendFriendRequest}>
                      <div className={styles.columnaIzquierdaListadoAmigosDivDiv}>
                        <input
                          type="text"
                          placeholder="Puedes añadir amigos con su Discordia Tag (ej. danielp)"
                          value={addFriendInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddFriendInput(e.target.value)}
                          className={styles.puedesAnadirAmigosSu}
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
                      <p className={styles.columnaIzquierdaListadoAmigosDivP2}>
                        {addFriendSuccess}
                      </p>
                    )}
                  </div>
                ) : activeTab === 'pending' ? (
                  /* Solicitudes de Amistad Pendientes */
                  <div>
                    <h3 className={styles.columnaIzquierdaListadoAmigosH3}>
                      PENDIENTE — {pendingRequests.length}
                    </h3>
                    {pendingRequests.length === 0 ? (
                      <p className={styles.columnaIzquierdaListadoAmigosP}>
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
                          <div className={styles.cabeceraAmigosPestanasDiv}>
                            <Avatar user={req.user} size={40} />
                            <div>
                              <span className={styles.cabeceraAmigosPestanasDivSpan}>
                                {req.user.displayName}
                              </span>
                              <p className={styles.solicitudAmistadEntrante}>
                                Solicitud de amistad entrante
                              </p>
                            </div>
                          </div>

                          <div className={styles.cabeceraAmigosPestanasDivDiv}>
                            <button
                              onClick={() => handleAcceptRequest(req.id)}
                              title="Aceptar"
                              className={styles.aceptar}
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(req.id)}
                              title="Rechazar"
                              className={styles.rechazar}
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
                    <div className={styles.barraFiltroAmigos}>
                      <input
                        type="text"
                        placeholder="Buscar amigos"
                        value={friendsSearchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFriendsSearchQuery(e.target.value)}
                        className={styles.buscarAmigos}
                      />
                      <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>

                    <h3 className={styles.columnaIzquierdaListadoAmigosH32}>
                      {activeTab === 'online'
                        ? `DISPONIBLE — ${displayedFriends.length}`
                        : activeTab === 'all'
                        ? `TODOS LOS AMIGOS — ${displayedFriends.length}`
                        : `BLOQUEADO — ${displayedFriends.length}`}
                    </h3>

                    {displayedFriends.length === 0 ? (
                      <p className={styles.columnaIzquierdaListadoAmigosP}>
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
                              className={styles.informacionAmigo}
                              onClick={() => onOpenUserProfile?.(friend.id)}
                            >
                              <div className={styles.informacionAmigoDiv}>
                                <Avatar user={friend} size={40} />
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

                              <div className={styles.informacionAmigoDiv2}>
                                <div className={styles.informacionAmigoDiv2Div}>
                                  <span className={styles.cabeceraAmigosPestanasDivSpan}>
                                    {friend.displayName}
                                  </span>
                                  <span className={styles.solicitudAmistadEntrante}>
                                    @{friend.username}
                                  </span>
                                  {friend.isPremium && (
                                    <Sparkles size={13} style={{ color: 'var(--text-warning)' }} />
                                  )}
                                </div>
                                <p className={styles.informacionAmigoDiv2P}>
                                  {friend.customStatus ||
                                    (friend.status === 'online' ? 'Disponible' : 'Desconectado')}
                                </p>
                              </div>
                            </div>

                            {/* Botones de Acción Rápida */}
                            <div className={styles.cabeceraAmigosPestanasDivDiv}>
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
                                    className={styles.botonIniciarDm}
                                  >
                                    <MessageSquare size={18} />
                                  </button>

                                  {/* Botón Iniciar Llamada */}
                                  <button
                                    onClick={() => onStartVoiceCall?.(friend.id)}
                                    title="Iniciar llamada"
                                    className={styles.botonIniciarDm}
                                  >
                                    <Phone size={18} />
                                  </button>

                                  {/* Botón Iniciar Videollamada */}
                                  <button
                                    onClick={() => onStartVideoCall?.(friend.id)}
                                    title="Iniciar videollamada"
                                    className={styles.botonIniciarDm}
                                  >
                                    <Video size={18} />
                                  </button>

                                  {/* Más Opciones */}
                                  <button
                                    onClick={() => onOpenUserProfile?.(friend.id)}
                                    title="Más opciones"
                                    className={styles.botonIniciarDm}
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
              <aside className={styles.columnaDerechaPanelActivo}>
                <h3 className={styles.activoAhora}>
                  Activo ahora
                </h3>

                {/* Tarjetas de Actividad de Amigos (Vacío) */}
                <div className={styles.tarjetasActividadAmigosVacio}>
                  <div className={styles.porAhoraTodoEsta}>
                    Por ahora todo está tranquilo
                  </div>
                  <div className={styles.tarjetasActividadAmigosVacioDiv}>
                    Cuando un amigo empiece una actividad, aparecerá aquí.
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
