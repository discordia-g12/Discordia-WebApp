import React from 'react'
import { Pressable, View } from 'react-native'
import { makeStyles } from '../../theme'
import { ActionLink, Text } from '../../ui'

interface ChatHeaderProps {
  channelName: string
  /** Estado del WebSocket del canal (undefined: el canal no tiene socket). */
  socketConnected?: boolean
  onOpenSettings?: () => void
  /** Chat directo: el nombre va sin "•". */
  direct?: boolean
  /** Reemplaza al estado de la conexión (en un chat directo, la presencia). */
  status?: string
  onPressTitle?: () => void
  /** Reemplazan a "_editar". */
  children?: React.ReactNode
}

/** Encabezado del chat, de 48 px: el canal en negrita, el estado de la conexión y "_editar". */
export default function ChatHeader({ channelName, socketConnected, onOpenSettings, direct = false, status, onPressTitle, children }: ChatHeaderProps) {
  const styles = useStyles()
  const statusText = status ?? (socketConnected === undefined ? null : socketConnected ? 'conectado/' : 'conectando/')
  return (
    <View style={styles.header}>
      <Pressable
        style={styles.channel}
        onPress={onPressTitle}
        disabled={!onPressTitle}
        accessibilityRole={onPressTitle ? 'button' : undefined}
        accessibilityLabel={onPressTitle ? `Ver el perfil de ${channelName}` : undefined}
      >
        <Text variant="bodySmall" bold numberOfLines={1} style={styles.title}>
          {direct ? channelName : `•${channelName}`}
        </Text>
        {statusText && (
          <Text variant="meta" tone="muted" accessibilityLiveRegion="polite">
            {statusText}
          </Text>
        )}
      </Pressable>
      <View style={styles.links}>
        {children ?? (
          <ActionLink onPress={onOpenSettings} accessibilityLabel={`Editar el canal ${channelName}`}>
            editar
          </ActionLink>
        )}
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
  title: { flexShrink: 1 },
  links: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    paddingHorizontal: t.space[4],
    borderLeftWidth: t.lines.hairline,
    borderLeftColor: t.colors.line,
  },
}))
