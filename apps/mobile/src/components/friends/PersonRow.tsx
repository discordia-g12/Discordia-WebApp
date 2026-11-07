import React from 'react'
import { Pressable, View } from 'react-native'
import type { PresenceStatus } from '@discordia/core'
import { makeStyles } from '../../theme'
import { SquareAvatar, Text } from '../../ui'
import { formatUnreadCount } from '../../utils/unread'

interface PersonRowProps {
  name: string
  username?: string
  avatar?: string | null
  presence?: PresenceStatus
  /** La línea chica de abajo: vista previa, estado o solicitud. */
  subtitle?: string | null
  unread?: number
  /** Tocar la fila: abre el chat. Sin esto, la fila no se toca. */
  onPress?: () => void
  /** Tocar el avatar: abre el perfil. */
  onPressAvatar?: () => void
  /** Acciones al final de la fila. */
  trailing?: React.ReactNode
}

/** Una persona en las listas de Amigos: avatar con presencia, nombre, una línea de detalle y lo que corresponda. */
export function PersonRow({ name, username, avatar, presence, subtitle, unread = 0, onPress, onPressAvatar, trailing }: PersonRowProps) {
  const styles = useStyles()
  const hasUnread = unread > 0
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPressAvatar}
        disabled={!onPressAvatar}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Ver el perfil de ${name}`}
      >
        <SquareAvatar user={{ username: username ?? name, displayName: name, avatar }} size="md" status={presence} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && !!onPress && styles.pressed]}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `Abrir el chat con ${name}${subtitle ? `: ${subtitle}` : ''}` : undefined}
      >
        <Text variant="bodySmall" bold numberOfLines={1}>
          {name}
        </Text>
        {!!subtitle && (
          <Text variant="meta" tone={hasUnread ? 'default' : 'muted'} bold={hasUnread} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </Pressable>
      {hasUnread && (
        <View style={styles.badge} accessibilityLabel={`${unread} sin leer`}>
          <Text variant="meta" tone="inverse" bold>
            {formatUnreadCount(unread)}
          </Text>
        </View>
      )}
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    paddingVertical: t.space[2],
    paddingHorizontal: t.space[4],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  main: { flex: 1, gap: 2, paddingVertical: t.space[1] },
  pressed: { opacity: 0.6 },
  badge: { paddingHorizontal: t.space[1], backgroundColor: t.colors.inverseBackground },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
}))
