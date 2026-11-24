import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search } from 'lucide-react';
import { FRIEND_REQUEST_MESSAGE_MAX } from '@discordia/core';
import type { Status, User } from '../../types';
import type { DmTarget } from '../../app/uiStore';
import {
  ActionLink,
  BlockButton,
  EmptyState,
  Skeleton,
  SquareAvatar,
  Tabs,
  UnderlineInput,
  useContextMenuTrigger,
  type TabItem,
} from '../../ui';
import { useNotificationLevelMenu } from '../notifications/useNotificationMenus';
import { DirectChatPanel } from './DirectChatPanel';
import { FriendRequestView } from './RequestCards';
import { profileToUser } from './profileUser';
import { openDirectChat } from './openDirectChat';
import { useHomeState, type DmRow, type FriendsTab, type HomeState } from './useHomeState';
import { useRelationshipActions } from './useRelationshipActions';
import styles from './HomeView.module.css';

export interface HomeViewProps {
  /** Columna izquierda del layout (AppShell): ahí va la lista de mensajes directos, por portal. */
  sidebarContainer?: HTMLElement | null;
  /** ID del usuario en sesión activa. */
  currentUserId: string;
  /** Lo que está abierto. Si es null, se muestra la sección Amigos. */
  selected: DmTarget | null;
  /** Al abrir un chat o una solicitud, o al volver a la sección Amigos (null). */
  onSelect: (target: DmTarget | null) => void;
  /** Callback para abrir el perfil modal de un usuario. */
  onOpenUserProfile: (userId: string) => void;
}

const STATUS_LABEL: Record<Status, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  invisible: 'Desconectado',
  offline: 'Desconectado',
};

const REQUEST_LABEL: Partial<Record<DmRow['kind'], string>> = {
  waiting_reply: 'Esperando respuesta',
  message_request: 'Solicitud de mensaje',
  friend_request: 'Solicitud de amistad',
};

const isOffline = (status?: Status) => !status || status === 'offline' || status === 'invisible';

const targetOf = (row: DmRow): DmTarget =>
  row.kind === 'friend_request' ? { type: 'friend-request', requestId: row.friendRequest.id } : { type: 'chat', userId: row.userId };

function isSelected(row: DmRow, selected: DmTarget | null) {
  if (selected?.type === 'chat') return row.kind !== 'friend_request' && row.userId === selected.userId;
  return row.kind === 'friend_request' && row.friendRequest.id === selected?.requestId;
}

/**
 * Inicio del rediseño (PDF, pág. 6). En la barra lateral, MENSAJES DIRECTOS con el buscador: conversaciones
 * y solicitudes como un chat más. En el contenido, AMIGOS con sus pestañas (subrayado que se desliza), el
 * buscador y la lista, y a la derecha ACTIVO AHORA; o el chat o la solicitud abiertos. Las filas de las tres
 * columnas están alineadas por las mismas líneas.
 */
export function HomeView({ sidebarContainer, currentUserId, selected, onSelect, onOpenUserProfile }: HomeViewProps) {
  const home = useHomeState();
  const request = selected?.type === 'friend-request' ? home.incomingRequests.find((r) => r.id === selected.requestId) : undefined;

  const newMessage = () => {
    onSelect(null);
    home.setActiveTab('add-friend');
  };

  return (
    <>
      {sidebarContainer
        ? createPortal(<DmSidebar home={home} selected={selected} onSelect={onSelect} onNewMessage={newMessage} />, sidebarContainer)
        : null}
      {selected?.type === 'chat' ? (
        <DirectChatPanel
          key={selected.userId}
          userId={selected.userId}
          currentUserId={currentUserId}
          onClose={() => onSelect(null)}
          onOpenUserProfile={onOpenUserProfile}
        />
      ) : request ? (
        <FriendRequestView
          key={request.id}
          request={request}
          onAccepted={(friendId) => onSelect({ type: 'chat', userId: friendId })}
          onDeclined={() => onSelect(null)}
          onOpenUserProfile={onOpenUserProfile}
        />
      ) : (
        <FriendsView home={home} onOpenUserProfile={onOpenUserProfile} />
      )}
    </>
  );
}

// ==========================================
// Barra lateral: mensajes directos
// ==========================================

function DmSidebar({
  home,
  selected,
  onSelect,
  onNewMessage,
}: {
  home: HomeState;
  selected: DmTarget | null;
  onSelect: (target: DmTarget) => void;
  onNewMessage: () => void;
}) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.row}>
        <SearchField
          label="Buscar conversaciones"
          placeholder="Encuentra o inicia una conversación"
          value={home.dmSearchQuery}
          onChange={home.setDmSearchQuery}
        />
      </div>
      <div className={`${styles.row} ${styles.sectionRow}`}>
        <h2 className={styles.label}>Mensajes directos /</h2>
        <button type="button" className={styles.iconButton} onClick={onNewMessage} aria-label="Nuevo mensaje directo" title="Nuevo mensaje directo">
          <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
      <DmList home={home} selected={selected} onSelect={onSelect} />
    </div>
  );
}

function DmList({ home, selected, onSelect }: { home: HomeState; selected: DmTarget | null; onSelect: (target: DmTarget) => void }) {
  const levelMenu = useNotificationLevelMenu();

  if (home.conversations.isLoading) {
    return (
      <div className={styles.sidebarEmpty}>
        <Skeleton lines={4} label="Cargando conversaciones" />
      </div>
    );
  }

  // Si fallan las conversaciones, igual se ven las solicitudes de amistad, que vienen de otro pedido
  const failed = home.conversations.isError;
  const query = home.dmSearchQuery.trim();

  return (
    <>
      {failed && (
        <div className={`${styles.sidebarEmpty} ${styles.emptyActions}`}>
          <EmptyState title="no se pudieron cargar" hint="revisá tu conexión e intentá de nuevo" />
          <ActionLink onPress={() => home.conversations.refetch()}>reintentar</ActionLink>
        </div>
      )}
      {home.filteredDms.length > 0 ? (
        <ul className={styles.dmList}>
          {home.filteredDms.map((row) => (
            <li key={row.key}>
              <DmItem
                row={row}
                active={isSelected(row, selected)}
                onPress={() => onSelect(targetOf(row))}
                onOpenMenu={
                  // Una solicitud de amistad todavía no es una conversación: no tiene avisos que elegir
                  row.kind === 'friend_request'
                    ? undefined
                    : levelMenu.open({ scopeType: 'channel', serverId: null, channelId: row.conversation.id }, row.user.displayName)
                }
              />
            </li>
          ))}
        </ul>
      ) : failed ? null : (
        <div className={styles.sidebarEmpty}>
          {query ? (
            <EmptyState title="sin resultados" hint={`ninguna conversación coincide con "${query}"`} />
          ) : (
            <EmptyState title="sin conversaciones" hint="escribile a un amigo y la conversación aparecerá aquí" />
          )}
        </div>
      )}
      {levelMenu.menu}
    </>
  );
}

/**
 * Un chat de la lista: nombre y estado con barra final, sin avatar; desconectado, en gris (PDF, pág. 6). Las
 * solicitudes muestran qué son en lugar del estado.
 */
function DmItem({
  row,
  active,
  onPress,
  onOpenMenu,
}: {
  row: DmRow;
  active: boolean;
  onPress: () => void;
  /** Click derecho, long-press o tecla Menú, con la posición: el menú de avisos del DM. */
  onOpenMenu?: (x: number, y: number) => void;
}) {
  const menuTrigger = useContextMenuTrigger(onOpenMenu);
  const { user } = row;
  const unread = row.kind === 'friend_request' ? 0 : row.conversation.unreadCount;

  return (
    <button
      type="button"
      className={`${styles.dm} ${active ? styles.dmActive : ''} ${isOffline(user.status) ? styles.dmOffline : ''}`}
      onClick={onPress}
      {...menuTrigger}
      aria-current={active ? 'page' : undefined}
    >
      <span className={styles.dmName}>{user.displayName}</span>
      <span className={styles.dmMeta}>
        {REQUEST_LABEL[row.kind] ?? STATUS_LABEL[user.status]}/{unread > 0 && <strong> {unread} sin leer</strong>}
      </span>
    </button>
  );
}

// ==========================================
// Contenido: amigos y activo ahora
// ==========================================

function FriendsView({ home, onOpenUserProfile }: { home: HomeState; onOpenUserProfile: (userId: string) => void }) {
  const pendingCount = home.incomingRequests.length + home.outgoingRequests.length;
  const tabs: TabItem<FriendsTab>[] = [
    { value: 'online', label: 'Disponible', count: home.onlineFriends.length },
    { value: 'all', label: 'Todos', count: home.allFriends.length },
    { value: 'pending', label: 'Pendiente', count: pendingCount || undefined },
    { value: 'blocked', label: 'Bloqueado' },
    { value: 'add-friend', label: 'Añadir amigo' },
  ];
  const showSearch = home.activeTab !== 'add-friend' && home.activeTab !== 'pending';

  return (
    <div className={styles.friends}>
      <header className={`${styles.row} ${styles.friendsHeader}`}>
        <h1 className={styles.friendsTitle}>Amigos</h1>
        <div className={styles.tabs}>
          <Tabs items={tabs} value={home.activeTab} onChange={home.setActiveTab} label="Amigos" />
        </div>
      </header>

      <section className={styles.friendsMain} aria-label="Lista de amigos">
        {showSearch && (
          <div className={styles.row}>
            <SearchField
              label="Buscar amigos"
              placeholder="Buscar amigos"
              value={home.friendsSearchQuery}
              onChange={home.setFriendsSearchQuery}
            />
          </div>
        )}
        {/* Se vuelve a montar al cambiar de pestaña: el contenido entra escalonado */}
        <div key={home.activeTab} className={styles.tabContent}>
          <TabContent home={home} onOpenUserProfile={onOpenUserProfile} />
        </div>
      </section>

      <aside className={styles.activeNow} aria-labelledby="activo-ahora">
        <div className={styles.row}>
          <h2 id="activo-ahora" className={styles.label}>
            Activo ahora
          </h2>
        </div>
        <div className={styles.activeNowBody}>
          <EmptyState title="por ahora todo está tranquilo" hint="cuando un amigo empiece una actividad aparecerá aquí." />
        </div>
      </aside>
    </div>
  );
}

/** Carga y error de una pestaña; sin ellos, su contenido. */
function TabQuery({
  query,
  label,
  children,
}: {
  query: { isLoading: boolean; isError: boolean; refetch: () => unknown };
  label: string;
  children: ReactNode;
}) {
  if (query.isLoading) {
    return (
      <div className={styles.empty}>
        <Skeleton lines={4} label={`Cargando ${label}`} />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Empty title={`no se pudieron cargar ${label}`} hint="revisá tu conexión e intentá de nuevo">
        <ActionLink onPress={() => query.refetch()}>reintentar</ActionLink>
      </Empty>
    );
  }
  return children;
}

function TabContent({ home, onOpenUserProfile }: { home: HomeState; onOpenUserProfile: (userId: string) => void }) {
  const relationship = useRelationshipActions();

  if (home.activeTab === 'add-friend') return <AddFriend home={home} />;

  if (home.activeTab === 'pending') {
    return (
      <TabQuery query={home.friendRequests} label="las solicitudes">
        {home.incomingRequests.length + home.outgoingRequests.length === 0 ? (
          <Empty title="no hay solicitudes pendientes" hint="cuando alguien te agregue vas a verlo acá" />
        ) : (
          <ul className={styles.list}>
            {home.incomingRequests.map((req) => (
              <FriendRow
                key={req.id}
                user={profileToUser(req.user)}
                detail={`Solicitud entrante/${req.message ? ` ${req.message}` : ''}`}
                onOpenProfile={() => onOpenUserProfile(req.user.id)}
                hidePresence
              >
                <ActionLink onPress={() => relationship.acceptFriend(req.id)}>aceptar</ActionLink>
                <ActionLink onPress={() => relationship.declineFriend(req.id, req.user.id)}>rechazar</ActionLink>
              </FriendRow>
            ))}
            {home.outgoingRequests.map((req) => (
              <FriendRow key={req.id} user={profileToUser(req.user)} detail="Solicitud enviada/" onOpenProfile={() => onOpenUserProfile(req.user.id)} hidePresence>
                <ActionLink onPress={() => relationship.cancelFriendRequest(req.id, req.user.id)}>cancelar</ActionLink>
              </FriendRow>
            ))}
          </ul>
        )}
      </TabQuery>
    );
  }

  const blockedTab = home.activeTab === 'blocked';
  const query = home.friendsSearchQuery.trim();

  return (
    <TabQuery query={blockedTab ? home.blocks : home.friends} label={blockedTab ? 'los bloqueados' : 'tus amigos'}>
      {home.displayedFriends.length === 0 ? (
        <NoFriends home={home} query={query} />
      ) : (
        <ul className={styles.list}>
          {home.displayedFriends.map((friend) => (
            <FriendRow
              key={friend.id}
              user={friend}
              detail={`@${friend.username} · ${friend.customStatus || STATUS_LABEL[friend.status]}/`}
              onOpenProfile={() => onOpenUserProfile(friend.id)}
              hidePresence={blockedTab}
            >
              {blockedTab ? (
                <ActionLink onPress={() => relationship.unblockUser(friend.id)}>desbloquear</ActionLink>
              ) : (
                <>
                  <ActionLink onPress={() => openDirectChat(friend.id)}>mensaje</ActionLink>
                  <ActionLink onPress={() => onOpenUserProfile(friend.id)}>perfil</ActionLink>
                  <ActionLink onPress={() => relationship.removeFriend(friend.id, friend.displayName)}>eliminar</ActionLink>
                </>
              )}
            </FriendRow>
          ))}
        </ul>
      )}
    </TabQuery>
  );
}

function NoFriends({ home, query }: { home: HomeState; query: string }) {
  if (query) return <Empty title="sin resultados" hint={`nadie coincide con "${query}"`} />;
  if (home.activeTab === 'blocked') return <Empty title="no bloqueaste a nadie" hint="los usuarios que bloquees aparecerán aquí" />;
  if (home.activeTab === 'all') {
    return (
      <Empty title="todavía no tenés amigos" hint="añadí a alguien con su nombre de usuario o email">
        <ActionLink onPress={() => home.setActiveTab('add-friend')}>añadir amigo</ActionLink>
      </Empty>
    );
  }
  return <Empty title="nadie disponible por ahora" hint="cuando tus amigos se conecten aparecerán aquí" />;
}

/** Fila de la lista: avatar cuadrado con presencia, nombre, detalle y acciones con guion bajo a la derecha. */
function FriendRow({
  user,
  detail,
  onOpenProfile,
  hidePresence = false,
  children,
}: {
  user: User;
  detail: string;
  onOpenProfile?: () => void;
  /** Sin el cuadrado de presencia: de bloqueados y solicitudes no se pide. */
  hidePresence?: boolean;
  children: ReactNode;
}) {
  const identity = (
    <>
      <SquareAvatar user={user} size={32} status={hidePresence ? undefined : user.status} />
      <span className={styles.friendText}>
        <span className={styles.friendName}>{user.displayName}</span>
        <span className={styles.friendDetail}>{detail}</span>
      </span>
    </>
  );

  return (
    <li className={styles.friendRow}>
      {onOpenProfile ? (
        <button type="button" className={styles.friendIdentity} onClick={onOpenProfile}>
          {identity}
        </button>
      ) : (
        <span className={styles.friendIdentity}>{identity}</span>
      )}
      <span className={styles.friendActions}>{children}</span>
    </li>
  );
}

function AddFriend({ home }: { home: HomeState }) {
  return (
    <form className={styles.addFriend} onSubmit={home.handleSendFriendRequest}>
      <div>
        <h2 className={styles.addFriendTitle}>Añadir amigo</h2>
        <p className={styles.addFriendText}>Podés añadir amigos con su nombre de usuario o su email.</p>
      </div>
      <UnderlineInput
        label="nombre de usuario o email"
        value={home.addFriendTarget}
        onChange={(e) => home.setAddFriendTarget(e.target.value)}
        placeholder="ej. danielp"
        autoComplete="off"
        error={home.addFriendError ?? undefined}
      />
      <UnderlineInput
        label="descripción (opcional)"
        value={home.addFriendMessage}
        onChange={(e) => home.setAddFriendMessage(e.target.value)}
        placeholder="contale de dónde se conocen"
        autoComplete="off"
        maxLength={FRIEND_REQUEST_MESSAGE_MAX}
        hint={`hasta ${FRIEND_REQUEST_MESSAGE_MAX} caracteres`}
      />
      <BlockButton type="submit" disabled={!home.addFriendTarget.trim()} loading={home.isSendingFriendRequest}>
        Enviar solicitud
      </BlockButton>
      {home.addFriendSuccess && (
        <p className={styles.addFriendSuccess} role="status">
          / {home.addFriendSuccess}
        </p>
      )}
    </form>
  );
}

function Empty({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <EmptyState title={title} hint={hint} />
      {children}
    </div>
  );
}

/** Buscador entre las líneas de la fila, con la lupa a la derecha. */
function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className={styles.search}>
      <label htmlFor={id} className={styles.srOnly}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        className={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Search size={14} strokeWidth={1.5} aria-hidden="true" className={styles.searchIcon} />
    </div>
  );
}
