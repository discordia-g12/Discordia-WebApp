import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search } from 'lucide-react';
import type { DirectMessage, Status, User } from '../../types';
import { ActionLink, BlockButton, EmptyState, SquareAvatar, Tabs, UnderlineInput, type TabItem } from '../../ui';
import { ChatView } from '../chat/ChatView';
import { useHomeState, type FriendsTab, type HomeState } from './useHomeState';
import type { HomeViewProps as LegacyHomeViewProps } from './legacy/LegacyHomeView';
import styles from './HomeView.module.css';

export interface HomeViewProps extends Omit<LegacyHomeViewProps, 'userPanel'> {
  /** Columna izquierda del layout (AppShell): ahí va la lista de mensajes directos, por portal. */
  sidebarContainer?: HTMLElement | null;
}

const STATUS_LABEL: Record<Status, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  invisible: 'Desconectado',
  offline: 'Desconectado',
};

const isOffline = (status?: Status) => !status || status === 'offline' || status === 'invisible';

/**
 * Inicio del rediseño (PDF, pág. 6). En la barra lateral, MENSAJES DIRECTOS con el buscador; en el
 * contenido, AMIGOS con sus pestañas (subrayado que se desliza), el buscador y la lista, y a la derecha
 * ACTIVO AHORA. Las filas de las tres columnas están alineadas por las mismas líneas.
 *
 * El chat de un DM todavía es el del diseño anterior: se rediseña junto con el chat de canal (paso 7).
 */
export function HomeView({
  sidebarContainer,
  currentUserId,
  directMessages = [],
  activeDirectMessageId,
  onSelectDirectMessage,
  onOpenUserProfile,
  onStartVoiceCall,
  onStartVideoCall,
  onSendMessage,
}: HomeViewProps) {
  const home = useHomeState({ currentUserId, directMessages, activeDirectMessageId, onSelectDirectMessage });
  const sidebar = <DmSidebar home={home} onNewMessage={() => home.setActiveTab('add-friend')} />;

  return (
    <>
      {sidebarContainer ? createPortal(sidebar, sidebarContainer) : null}
      {home.activeDm ? (
        <ChatView
          directMessage={home.activeDm}
          messages={[]}
          currentUserId={currentUserId}
          users={{}}
          onOpenUserProfile={onOpenUserProfile}
          onStartVoiceCall={() => onStartVoiceCall?.(home.activeDm!.recipientId)}
          onStartVideoCall={() => onStartVideoCall?.(home.activeDm!.recipientId)}
          onSendMessage={(content) => onSendMessage?.(home.activeDm!.id, content)}
        />
      ) : (
        <FriendsView home={home} onOpenUserProfile={onOpenUserProfile} onStartVoiceCall={onStartVoiceCall} />
      )}
    </>
  );
}

// ==========================================
// Barra lateral: mensajes directos
// ==========================================

function DmSidebar({ home, onNewMessage }: { home: HomeState; onNewMessage: () => void }) {
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

      {home.filteredDms.length === 0 ? (
        <div className={styles.sidebarEmpty}>
          {home.dmSearchQuery.trim() ? (
            <EmptyState title="sin resultados" hint={`ninguna conversación coincide con "${home.dmSearchQuery.trim()}"`} />
          ) : (
            <EmptyState title="sin conversaciones" hint="escribile a un amigo y la conversación aparecerá aquí" />
          )}
        </div>
      ) : (
        <ul className={styles.dmList}>
          {home.filteredDms.map((dm) => (
            <li key={dm.id}>
              <DmItem dm={dm} active={dm.id === home.activeDmId} onPress={() => home.selectDm(dm.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Conversación: nombre y estado con barra final; desconectada, en gris (PDF, pág. 6). Sin avatar. */
function DmItem({ dm, active, onPress }: { dm: DirectMessage; active: boolean; onPress: () => void }) {
  const name = dm.recipient?.displayName || 'Usuario';
  const status = dm.recipient?.status;
  const unread = dm.unreadCount ?? 0;

  return (
    <button
      type="button"
      className={`${styles.dm} ${active ? styles.dmActive : ''} ${isOffline(status) ? styles.dmOffline : ''}`}
      onClick={onPress}
      aria-current={active ? 'page' : undefined}
    >
      <span className={styles.dmName}>{name}</span>
      <span className={styles.dmMeta}>
        {STATUS_LABEL[status ?? 'offline']}/{unread > 0 && <strong> {unread} sin leer</strong>}
      </span>
    </button>
  );
}

// ==========================================
// Contenido: amigos y activo ahora
// ==========================================

function FriendsView({
  home,
  onOpenUserProfile,
  onStartVoiceCall,
}: {
  home: HomeState;
  onOpenUserProfile?: (userId: string) => void;
  onStartVoiceCall?: (userId: string) => void;
}) {
  const tabs: TabItem<FriendsTab>[] = [
    { value: 'online', label: 'Disponible', count: home.onlineFriends.length },
    { value: 'all', label: 'Todos', count: home.allFriends.length },
    { value: 'pending', label: 'Pendiente', count: home.pendingRequests.length || undefined },
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
          <TabContent home={home} onOpenUserProfile={onOpenUserProfile} onStartVoiceCall={onStartVoiceCall} />
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

function TabContent({
  home,
  onOpenUserProfile,
  onStartVoiceCall,
}: {
  home: HomeState;
  onOpenUserProfile?: (userId: string) => void;
  onStartVoiceCall?: (userId: string) => void;
}) {
  if (home.activeTab === 'add-friend') return <AddFriend home={home} />;

  if (home.activeTab === 'pending') {
    if (home.pendingRequests.length === 0) {
      return <Empty title="no hay solicitudes pendientes" hint="cuando alguien te agregue vas a verlo acá" />;
    }
    return (
      <ul className={styles.list}>
        {home.pendingRequests.map((req) => (
          <FriendRow key={req.id} user={req.user} detail={req.type === 'incoming' ? 'Solicitud entrante/' : 'Solicitud enviada/'}>
            {req.type === 'incoming' && <ActionLink onPress={() => home.handleAcceptRequest(req.id)}>aceptar</ActionLink>}
            <ActionLink onPress={() => home.handleDeclineRequest(req.id)}>{req.type === 'incoming' ? 'rechazar' : 'cancelar'}</ActionLink>
          </FriendRow>
        ))}
      </ul>
    );
  }

  const query = home.friendsSearchQuery.trim();
  if (home.displayedFriends.length === 0) {
    if (query) return <Empty title="sin resultados" hint={`nadie coincide con "${query}"`} />;
    if (home.activeTab === 'blocked') return <Empty title="no bloqueaste a nadie" hint="los usuarios que bloquees aparecerán aquí" />;
    if (home.activeTab === 'all') {
      return (
        <Empty title="todavía no tenés amigos" hint="añadí a alguien con su nombre de usuario">
          <ActionLink onPress={() => home.setActiveTab('add-friend')}>añadir amigo</ActionLink>
        </Empty>
      );
    }
    return <Empty title="nadie disponible por ahora" hint="cuando tus amigos se conecten aparecerán aquí" />;
  }

  return (
    <ul className={styles.list}>
      {home.displayedFriends.map((friend) => (
        <FriendRow
          key={friend.id}
          user={friend}
          detail={`@${friend.username} · ${friend.customStatus || STATUS_LABEL[friend.status]}/`}
          onOpenProfile={() => onOpenUserProfile?.(friend.id)}
        >
          {home.activeTab === 'blocked' ? (
            <ActionLink onPress={() => home.handleUnblock(friend.id)}>desbloquear</ActionLink>
          ) : (
            <>
              <ActionLink onPress={() => home.messageFriend(friend.id)}>mensaje</ActionLink>
              <ActionLink onPress={() => onStartVoiceCall?.(friend.id)}>llamar</ActionLink>
              <ActionLink onPress={() => onOpenUserProfile?.(friend.id)}>perfil</ActionLink>
            </>
          )}
        </FriendRow>
      ))}
    </ul>
  );
}

/** Fila de la lista: avatar cuadrado con presencia, nombre, detalle y acciones con guion bajo a la derecha. */
function FriendRow({
  user,
  detail,
  onOpenProfile,
  children,
}: {
  user: User;
  detail: string;
  onOpenProfile?: () => void;
  children: ReactNode;
}) {
  const identity = (
    <>
      <SquareAvatar user={user} size={32} status={user.status} />
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
        <p className={styles.addFriendText}>Podés añadir amigos con su nombre de usuario de Discordia.</p>
      </div>
      <UnderlineInput
        label="nombre de usuario"
        value={home.addFriendInput}
        onChange={(e) => home.setAddFriendInput(e.target.value)}
        placeholder="ej. danielp"
        autoComplete="off"
      />
      <BlockButton type="submit" disabled={!home.addFriendInput.trim()}>
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
