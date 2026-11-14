import React from 'react'
import { Pressable, View } from 'react-native'
import { makeStyles } from '../../theme'
import { Settings } from 'lucide-react-native'
import { IconButton, Text } from '../../ui'

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
  /** Íconos (IconButton, MoreMenu) que reemplazan al de editar el canal. */
  actions?: React.ReactNode
}

/**
 * Encabezado del chat, de 48 px: el canal en negrita, el estado de la conexión y las acciones como íconos
 * cuadrados (en un canal, editar). El nombre ocupa lo que queda: con 3 íconos y "más" entra en 375 pt.
 */
export default function ChatHeader({ channelName, socketConnected, onOpenSettings, direct = false, status, onPressTitle, actions }: ChatHeaderProps) {
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
          <Text variant="meta" tone="muted" numberOfLines={1} style={styles.status} accessibilityLiveRegion="polite">
            {statusText}
          </Text>
        )}
      </Pressable>
      <View style={styles.actions}>
        {actions ?? <IconButton icon={Settings} label={`Editar el canal ${channelName}`} onPress={onOpenSettings} />}
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
  channel: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: t.space[2], paddingRight: t.space[2] },
  title: { flexShrink: 1 },
  // Sin lugar (teléfono chico, varias acciones), se achica el estado antes que el nombre: con el mismo
  // peso, "desconectado/" quedaba entero y el nombre en "Lu…"
  status: { flexShrink: 1000 },
  // Cada ícono trae su línea a la izquierda
  actions: { alignSelf: 'stretch', flexDirection: 'row' },
}))
