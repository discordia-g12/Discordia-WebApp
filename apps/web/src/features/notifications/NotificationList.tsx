import { useMemo } from 'react';
import {
  errorMessageFor,
  formatTimeAgo,
  mentionsToText,
  notificationPlace,
  notificationTitle,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsQuery,
  useServersQuery,
  type AppNotification,
} from '@discordia/core';
import { ActionLink, EmptyState, Skeleton, SquareAvatar } from '../../ui';
import { showToast } from '../../app/uiStore';
import { useUsers } from '../../app/usersContext';
import { openNotification } from './notificationActions';
import styles from './NotificationList.module.css';

/** Nombres de servidores y canales por id, para decir dónde pasó cada aviso. */
function usePlaceNames() {
  const { data: servers } = useServersQuery();
  return useMemo(() => {
    const serverNames = new Map<string, string>();
    const channelNames = new Map<string, string>();
    for (const server of servers ?? []) {
      serverNames.set(server.id, server.name);
      for (const category of server.categories) for (const channel of category.channels) channelNames.set(channel.id, channel.name);
    }
    return { serverNames, channelNames };
  }, [servers]);
}

/**
 * Bandeja de avisos, de la más nueva a la más vieja (centro de notificaciones, ADR 0017): mensajes directos,
 * menciones, respuestas en hilos y, con nivel "Todos", cualquier mensaje. Abrir uno lo marca leído y lleva a
 * la conversación. Es la misma lista en el modal de escritorio y en la pestaña "Avisos" de mobile web.
 */
export function NotificationList({ onOpened }: { onOpened?: (notification: AppNotification) => void }) {
  const { items, unreadCount, isPending, isError, refetch, hasMore, fetchMore, isFetchingNextPage } =
    useNotificationsQuery();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const { usersMap, userOrFallback } = useUsers();
  const { serverNames, channelNames } = usePlaceNames();
  const names = {
    user: (id: string) => usersMap[id]?.displayName ?? 'usuario',
    role: () => 'rol',
  };

  const open = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    openNotification(notification);
    onOpened?.(notification);
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
    return <EmptyState title="No tenés notificaciones" hint="acá vas a ver mensajes directos, menciones y respuestas en tus hilos" />;
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
          const actor = userOrFallback(notification.actorId);
          const channelName = channelNames.get(notification.channelId);
          const title = notificationTitle(notification.reason, actor.displayName, channelName);
          const serverName = notification.serverId ? serverNames.get(notification.serverId) : undefined;
          const place = notificationPlace(notification, channelName);
          const context = serverName ? `${serverName} › ${place}` : place;
          const unread = !notification.readAt;
          return (
            <li key={notification.id}>
              <button
                type="button"
                className={`${styles.item} ${unread ? styles.unread : ''}`}
                onClick={() => open(notification)}
                aria-label={`${unread ? 'Sin leer: ' : ''}${title}, ${context}`}
              >
                <SquareAvatar user={actor} size="sm" />
                <span className={styles.body}>
                  <span className={styles.title}>
                    {unread && <span className={styles.dot} aria-hidden="true" />}
                    {title}
                    <time className={styles.time} dateTime={notification.createdAt}>
                      {formatTimeAgo(notification.createdAt)}
                    </time>
                  </span>
                  <span className={styles.context}>{context}</span>
                  {notification.preview && (
                    <span className={styles.preview}>{mentionsToText(notification.preview, names)}</span>
                  )}
                </span>
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
