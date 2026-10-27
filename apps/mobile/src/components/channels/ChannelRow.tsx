import React from 'react'
import { Pressable, View } from 'react-native'
import { Lock } from 'lucide-react-native'
import { makeStyles, useTheme } from '../../theme'
import { Text } from '../../ui'
import type { Channel } from '../../types'

interface ChannelRowProps {
  channel: Channel
  active: boolean
  onPress: (channel: Channel) => void
  /** Mantener presionado: editar el canal. */
  onLongPress: (channel: Channel) => void
  /** Canal de voz sin permiso para conectarse: candado y tocarlo no hace nada (editarlo sigue igual). */
  locked?: boolean
}

/** Canal: "•nombre"; el activo en negrita con una barra negra a la izquierda; los no leídos, con el número en bloque negro. */
export default function ChannelRow({ channel, active, onPress, onLongPress, locked = false }: ChannelRowProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const count = channel.mentions || channel.unread || 0

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={locked ? undefined : () => onPress(channel)}
      onLongPress={() => onLongPress(channel)}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`${channel.type === 'voice' ? 'Canal de voz' : 'Canal'} ${channel.name}${count ? `, ${count} sin leer` : ''}${locked ? ', sin permiso para conectarte' : ''}`}
      accessibilityState={{ selected: active, disabled: locked }}
      accessibilityHint="Mantené presionado para editarlo"
    >
      {active && <View style={styles.bar} />}
      <Text variant="bodySmall" bold={active || count > 0} tone={locked ? 'muted' : 'default'} numberOfLines={1} style={styles.name}>
        •{channel.name}
      </Text>
      {locked && <Lock color={colors.textMuted} size={12} strokeWidth={1.5} />}
      {count > 0 && (
        <View style={styles.badge}>
          <Text variant="meta" tone="inverse" bold>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const useStyles = makeStyles(t => ({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 36, paddingHorizontal: t.space[5] },
  pressed: { backgroundColor: t.colors.line },
  bar: { position: 'absolute', left: 0, top: 6, bottom: 6, width: t.lines.accent, backgroundColor: t.colors.inverseBackground },
  name: { flex: 1 },
  badge: { marginLeft: t.space[2], paddingHorizontal: t.space[1], backgroundColor: t.colors.inverseBackground },
}))
