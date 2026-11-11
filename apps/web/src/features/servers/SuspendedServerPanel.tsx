import { SUSPENDED_SERVER_MESSAGE, SUSPENDED_SERVER_TITLE } from '@discordia/core';
import { ActionLink } from '../../ui';
import { useUIStore } from '../../app/uiStore';
import { useCurrentUser } from '../profile/currentUserStore';
import styles from './SuspendedServerPanel.module.css';

/**
 * Lo que ve un miembro al abrir un servidor suspendido por el staff, en lugar de los canales y el chat.
 * El contenido se conserva y vuelve cuando se levanta la suspensión; mientras tanto un miembro solo puede
 * salir. El dueño no puede salir de su servidor (y eliminarlo está bloqueado): solo ve el aviso.
 */
export function SuspendedServerPanel({ server }: { server: { name: string; ownerId: string } }) {
  const currentUser = useCurrentUser();
  const canLeave = server.ownerId !== currentUser.id;
  return (
    <section className={styles.root} role="status" aria-labelledby="suspended-server-title">
      <span className={styles.tag} aria-hidden="true">
        suspended
      </span>
      <h2 id="suspended-server-title" className={styles.title}>
        {SUSPENDED_SERVER_TITLE}
      </h2>
      <p className={styles.message}>{SUSPENDED_SERVER_MESSAGE}</p>
      {canLeave && (
        <ActionLink onPress={() => useUIStore.getState().openConfirm('leave-server', server.name)}>salir del servidor</ActionLink>
      )}
    </section>
  );
}
