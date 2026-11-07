import {
  dmActions,
  isProfileUnavailable,
  useMutualServersQuery,
  usePresenceQuery,
  usePublicProfileQuery,
  type PublicProfile,
} from '@discordia/core';
import { ActionLink, EmptyState, Modal, ModalActions, Skeleton, SquareAvatar } from '../../ui';
import { openDirectChat } from '../friends/openDirectChat';
import { profileToUser } from '../friends/profileUser';
import { relationshipLinks, useRelationshipActions } from '../friends/useRelationshipActions';
import styles from './UserProfileModal.module.css';

export interface UserProfileModalProps {
  userId: string;
  currentUserId?: string;
  onClose: () => void;
  onEditProfile?: () => void;
}

/**
 * Perfil público de otro usuario (rediseño): el nombre en display, una franja con el avatar cuadrado encima,
 * el estado con barra final, la bio, desde cuándo está, los servidores en común y las acciones. Suspendido o
 * inexistente: "perfil no disponible", igual en los dos casos.
 */
export function UserProfileModal({ userId, currentUserId, onClose, onEditProfile }: UserProfileModalProps) {
  const { data: profile, isLoading, error, refetch } = usePublicProfileQuery(userId);

  if (isLoading) {
    return (
      <Modal title="Perfil" onClose={onClose}>
        <Skeleton lines={5} label="Cargando perfil" />
      </Modal>
    );
  }

  if (!profile) {
    return (
      <Modal title="Perfil" onClose={onClose}>
        {isProfileUnavailable(error) ? (
          <EmptyState title="perfil no disponible" hint="esta cuenta no se puede ver" />
        ) : (
          <>
            <EmptyState title="no se pudo cargar el perfil" hint="revisá tu conexión e intentá de nuevo" />
            <ModalActions>
              <ActionLink onPress={() => refetch()}>reintentar</ActionLink>
            </ModalActions>
          </>
        )}
      </Modal>
    );
  }

  return (
    <LoadedProfile
      openedId={userId}
      profile={profile}
      isSelf={userId === currentUserId}
      onClose={onClose}
      onEditProfile={onEditProfile}
    />
  );
}

function LoadedProfile({
  openedId,
  profile,
  isSelf,
  onClose,
  onEditProfile,
}: {
  /** El id con el que se abrió: los miembros están guardados con el `sub` crudo, que puede no ser el canónico. */
  openedId: string;
  profile: PublicProfile;
  isSelf: boolean;
  onClose: () => void;
  onEditProfile?: () => void;
}) {
  const relationship = useRelationshipActions();
  const { data: presence } = usePresenceQuery([profile.id]);
  const user = profileToUser(profile, presence);
  const can = dmActions({ relationship: profile.relationship });
  const since = new Date(profile.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

  const message = () => {
    onClose();
    openDirectChat(openedId);
  };

  return (
    <Modal title={user.displayName} description={`@${user.username}`} onClose={onClose}>
      <div className={styles.card}>
        <div className={styles.banner} aria-hidden="true" />
        <div className={styles.avatar}>
          <SquareAvatar user={user} size={80} status={user.status} />
        </div>
        <p className={styles.status}>{user.customStatus || (user.status === 'online' ? 'Conectado' : 'Desconectado')}/</p>
      </div>

      <section className={styles.section} aria-label="Sobre mí">
        <h3 className={styles.label}>Sobre mí /</h3>
        <p className={user.bio ? undefined : styles.empty}>{user.bio || '/ todavía no escribió nada'}</p>
      </section>

      <section className={styles.section} aria-label="En Discordia desde">
        <h3 className={styles.label}>En Discordia desde /</h3>
        <p>{since}</p>
      </section>

      {!isSelf && <MutualServers userId={openedId} />}

      <ModalActions>
        {isSelf ? (
          onEditProfile && <ActionLink onPress={onEditProfile}>editar perfil</ActionLink>
        ) : (
          <span className={styles.links}>
            {can.canMessage && <ActionLink onPress={message}>enviar mensaje</ActionLink>}
            {relationshipLinks(profile, relationship).map(({ label, onPress }) => (
              <ActionLink key={label} onPress={onPress}>
                {label}
              </ActionLink>
            ))}
          </span>
        )}
      </ModalActions>
    </Modal>
  );
}

function MutualServers({ userId }: { userId: string }) {
  const { data: servers, isLoading, isError, refetch } = useMutualServersQuery(userId);

  return (
    <section className={styles.section} aria-label="Servidores en común">
      <h3 className={styles.label}>Servidores en común /</h3>
      {isLoading ? (
        <Skeleton lines={1} label="Cargando servidores en común" />
      ) : isError ? (
        <ActionLink onPress={() => refetch()}>reintentar</ActionLink>
      ) : servers?.length ? (
        <ul className={styles.servers}>
          {servers.map((server) => (
            <li key={server.id}>{server.name}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>/ ninguno por ahora</p>
      )}
    </section>
  );
}
