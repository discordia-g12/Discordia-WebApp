import React from 'react'
import { FlatList, Pressable, View } from 'react-native'
import {
  formatTimeAgo,
  mentionsToText,
  notificationTitle,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsQuery,
  type AppNotification,
} from '@discordia/core'
import { makeStyles } from '../../theme'
import { ActionLink, EmptyState, Skeleton, Text } from '../../ui'
import type { UserDisplay } from '../../hooks/useUserProfiles'
import { Padded, Screen } from './ShellScreen'

interface NotificationsTabProps {
  describeUser: (userId: string) => UserDisplay
  /** Lleva a la conversación del aviso (y abre el hilo, si es de un hilo). */
  onOpen: (notification: AppNotification) => void
}

/**
 * Pestaña Avisos (CA5 de hilos; el centro de notificaciones de la épica): de la más nueva a la más vieja. Abrir
 * uno lo marca leído. Se mantiene al día con NOTIFICATION_CREATED por el inbox y cada 60 s.
 */
export function NotificationsTab({ describeUser, onOpen }: NotificationsTabProps) {
  const styles = useStyles()
  const { items, unreadCount, isPending, isError, refetch, isRefetching, hasMore, fetchMore, isFetchingNextPage } =
    useNotificationsQuery()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const names = { user: (id: string) => describeUser(id).name, role: () => 'rol' }

  const open = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id)
    onOpen(notification)
  }

  let body: React.ReactNode
  if (isPending) {
    body = (
      <Padded>
        <Skeleton lines={4} label="Cargando avisos" />
      </Padded>
    )
  } else if (isError && items.length === 0) {
    body = (
      <Padded>
        <Text tone="muted">No pudimos traer tus avisos.</Text>
        <ActionLink size="bodySmall" onPress={() => void refetch()}>
          reintentar
        </ActionLink>
      </Padded>
    )
  } else if (items.length === 0) {
    body = (
      <Padded>
        <EmptyState title="no hay notificaciones para mostrar" hint="acá vas a ver las respuestas en tus hilos" />
      </Padded>
    )
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={n => n.id}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        onEndReached={() => {
          if (hasMore && !isFetchingNextPage) void fetchMore()
        }}
        ListHeaderComponent={
          unreadCount > 0 ? (
            <View style={styles.actions}>
              <ActionLink size="bodySmall" onPress={() => markAll.mutate()}>
                marcar todo como leído
              </ActionLink>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const title = notificationTitle(item.reason, describeUser(item.actorId).name)
          const unread = !item.readAt
          return (
            <Pressable
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${unread ? 'Sin leer: ' : ''}${title}`}
            >
              <View style={styles.row}>
                {unread && <View style={styles.dot} />}
                <Text variant="bodySmall" bold={unread} tone={unread ? 'default' : 'muted'} style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                <Text variant="meta" tone="muted">
                  {formatTimeAgo(item.createdAt)}
                </Text>
              </View>
              {!!item.preview && (
                <Text variant="meta" tone="muted" numberOfLines={1}>
                  {mentionsToText(item.preview, names)}
                </Text>
              )}
            </Pressable>
          )
        }}
      />
    )
  }

  return (
    <Screen title="Avisos" scroll={false}>
      {body}
    </Screen>
  )
}

const useStyles = makeStyles(t => ({
  actions: { paddingHorizontal: t.space[4], paddingBottom: t.space[2] },
  item: {
    gap: t.space[1],
    paddingHorizontal: t.space[4],
    paddingVertical: t.space[3],
    borderBottomWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
  },
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.colors.text },
  title: { flex: 1 },
}))
