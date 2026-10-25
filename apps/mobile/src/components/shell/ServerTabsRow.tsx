import React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Compass, Plus } from 'lucide-react-native'
import { makeStyles, useTheme } from '../../theme'
import { Logo, ServerStrip } from '../../ui'
import type { Server } from '../../types'

interface ServerTabsRowProps {
  servers: Server[]
  activeServerId?: string
  onSelect: (serverId: string) => void
  onAdd: () => void
  /** Unirse con una invitación (sin él, no se muestra). */
  onJoin?: () => void
}

/** Tira de servidores de arriba (el rail del escritorio, acostado): el logo, las franjas que se deslizan, crear y unirse. */
export function ServerTabsRow({ servers, activeServerId, onSelect, onAdd, onJoin }: ServerTabsRowProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        <Logo size={18} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strips} accessibilityLabel="Servidores">
        {servers.map(server => (
          <ServerStrip
            key={server.id}
            server={server}
            active={server.id === activeServerId}
            unread={server.unread}
            onPress={() => onSelect(server.id)}
          />
        ))}
      </ScrollView>
      <Pressable style={styles.iconButton} onPress={onAdd} accessibilityRole="button" accessibilityLabel="Añadir un servidor">
        <Plus color={colors.text} size={18} strokeWidth={1.5} />
      </Pressable>
      {onJoin && (
        <Pressable style={styles.iconButton} onPress={onJoin} accessibilityRole="button" accessibilityLabel="Unirme con una invitación">
          <Compass color={colors.text} size={18} strokeWidth={1.5} />
        </Pressable>
      )}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: t.space[7],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.lineStrong,
  },
  logo: {
    width: t.space[7],
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: t.lines.hairline,
    borderRightColor: t.colors.lineStrong,
  },
  strips: { alignItems: 'center', gap: t.space[2], paddingHorizontal: t.space[3] },
  iconButton: {
    width: t.space[7],
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: t.lines.hairline,
    borderLeftColor: t.colors.lineStrong,
  },
}))
