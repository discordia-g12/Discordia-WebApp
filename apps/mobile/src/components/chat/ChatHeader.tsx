import React from 'react'
import { View } from 'react-native'
import { makeStyles } from '../../theme'
import { ActionLink, Text } from '../../ui'

interface ChatHeaderProps {
  channelName: string
  /** Estado del WebSocket del canal (undefined: el canal no tiene socket). */
  socketConnected?: boolean
  onOpenSettings: () => void
}

/** Encabezado del chat, de 48 px: el canal en negrita, el estado de la conexión y "_editar". */
export default function ChatHeader({ channelName, socketConnected, onOpenSettings }: ChatHeaderProps) {
  const styles = useStyles()
  return (
    <View style={styles.header}>
      <View style={styles.channel}>
        <Text variant="bodySmall" bold numberOfLines={1}>
          •{channelName}
        </Text>
        {socketConnected !== undefined && (
          <Text variant="meta" tone="muted" accessibilityLiveRegion="polite">
            {socketConnected ? 'conectado/' : 'conectando/'}
          </Text>
        )}
      </View>
      <View style={styles.links}>
        <ActionLink onPress={onOpenSettings} accessibilityLabel={`Editar el canal ${channelName}`}>
          editar
        </ActionLink>
      </View>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: t.space[7],
    paddingLeft: t.space[4],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  channel: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: t.space[2] },
  links: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: t.space[4],
    borderLeftWidth: t.lines.hairline,
    borderLeftColor: t.colors.line,
  },
}))
