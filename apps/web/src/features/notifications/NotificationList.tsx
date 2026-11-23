import {
  errorMessageFor,
  formatTimeAgo,
  mentionsToText,
  notificationTitle,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsQuery,
  type AppNotification,
} from '@discordia/core';
import { ActionLink, EmptyState, Skeleton } from '../../ui';
import { showToast } from '../../app/uiStore';
import { useUsers } from '../../app/usersContext';
import { openNotification } from './notificationActions';
import styles from './NotificationList.module.css';

/**
 * Bandeja de avisos, de la más nueva a la más vieja (CA5 de hilos). Abrir uno lo marca leído y lleva a la
 * conversación. Es la misma lista en el modal de escritorio y en la pestaña "Avisos" de mobile web.
 */
export function NotificationList({ onOpened }: { onOpened?: () => void }) {
  const { items, unreadCount, isPending, isError, refetch, hasMore, fetchMore, isFetchingNextPage } =
    useNotificationsQuery();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const { usersMap } = useUsers();
  const names = {
    user: (id: string) => usersMap[id]?.displayName ?? 'usuario',
    role: () => 'rol',
  };

  const open = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    openNotification(notification);
    onOpened?.();
  };

  if (isPending) return <Skeleton lines={4} label="Cargando avisos" />;
  if (isError && items.length === 0) {
    return (
      <p role="alert" className={styles.error}>
        No pudimos traer tus avisos. <ActionLink onPress={() => void refetch()}>reintentar</ActionLink>
      </p>
    );
  }
  if (items.length === 0) {
    return <EmptyState title="no hay notificaciones para mostrar" hint="acá vas a ver las respuestas en tus hilos" />;
  }

  return (
    <div className={styles.root}>
      {unreadCount > 0 && (
        <p className={styles.actions}>
          <ActionLink
            onPress={() =>
              markAll.mutate(undefined, {
                onError: (err) => showToast(errorMessageFor(err, {}, 'No se pudieron marcar como leídos'), 'danger'),
              })
            }
          >
            marcar todo como leído
          </ActionLink>
        </p>
      )}
      <ul className={styles.list} aria-label="Avisos">
        {items.map((notification) => {
          const actor = usersMap[notification.actorId]?.displayName ?? 'Alguien';
          const unread = !notification.readAt;
          return (
            <li key={notification.id}>
              <button
                type="button"
                className={`${styles.item} ${unread ? styles.unread : ''}`}
                onClick={() => open(notification)}
                aria-label={`${unread ? 'Sin leer: ' : ''}${notificationTitle(notification.reason, actor)}`}
              >
                <span className={styles.title}>
                  {unread && <span className={styles.dot} aria-hidden="true" />}
                  {notificationTitle(notification.reason, actor)}
                  <time className={styles.time} dateTime={notification.createdAt}>
                    {formatTimeAgo(notification.createdAt)}
                  </time>
                </span>
                {notification.preview && (
                  <span className={styles.preview}>{mentionsToText(notification.preview, names)}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <p className={styles.actions}>
          {isFetchingNextPage ? (
            <span role="status">/ cargando…</span>
          ) : (
            <ActionLink onPress={() => void fetchMore()}>ver anteriores</ActionLink>
          )}
        </p>
      )}
    </div>
  );
}
