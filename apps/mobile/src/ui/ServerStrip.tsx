import React, { useEffect, useState } from 'react'
import { Animated, Image, Pressable, View } from 'react-native'
import { makeStyles, useTheme } from '../theme'
import { Text } from './Text'
import { ServerIcon } from './ServerIcon'
import { timing, useReducedMotion } from './motion'

interface ServerStripProps {
  server: { name: string; iconUrl?: string | null; banner?: string | null }
  active?: boolean
  /** Actividad nueva: una marca en la franja. */
  unread?: string | boolean
  onPress?: () => void
  /**
   * horizontal: la tira de servidores de arriba (la única en mobile). La activa baja hacia el contenido.
   * En táctil no hay etiqueta flotante: el nombre está en el encabezado de la pantalla.
   */
  orientation?: 'vertical' | 'horizontal'
  /** El staff suspendió el servidor: sigue en la tira, con un cartel rojo "suspended". */
  suspended?: boolean
}

/**
 * Servidor como franja rectangular: el banner de fondo y el ícono a la izquierda. El ícono identifica al
 * servidor y el banner lo decora.
 */
export function ServerStrip({ server, active = false, unread, onPress, orientation = 'horizontal', suspended = false }: ServerStripProps) {
  const styles = useStyles()
  const theme = useTheme()
  const reduce = useReducedMotion()
  const [shift] = useState(() => new Animated.Value(active ? 1 : 0))
  useEffect(() => {
    timing(shift, active ? 1 : 0, { name: 'fast', reduce }).start()
  }, [active, reduce, shift])

  const horizontal = orientation === 'horizontal'
  // El ícono ocupa el alto de la franja sin el borde de abajo
  const iconSize = theme.layout.serverStripHeight - STRIP_BORDER
  const offset = shift.interpolate({ inputRange: [0, 1], outputRange: [0, horizontal ? 4 : 8] })
  // Suspendido no tiene actividad: no se puede leer ni escribir
  const activity = suspended ? 'suspendido' : typeof unread === 'string' ? unread : unread ? 'actividad nueva' : null

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Servidor ${server.name}${activity ? `, ${activity}` : ''}`}
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 12, bottom: 12 }}
    >
      <Animated.View
        style={[
          styles.strip,
          { transform: [horizontal ? { translateY: offset } : { translateX: offset }] },
        ]}
      >
        {!!server.banner && <Image source={{ uri: server.banner }} style={[styles.banner, suspended && styles.dimmed]} />}
        <View style={[styles.icon, suspended && styles.dimmed]}>
          <ServerIcon server={server} size={iconSize} />
        </View>
        {suspended ? (
          <View style={styles.suspendedTag} testID="server-suspended">
            <Text variant="meta" tone="onDanger" bold style={styles.suspendedText}>
              SUSPENDED
            </Text>
          </View>
        ) : (
          !!unread && <View style={styles.unread} />
        )}
      </Animated.View>
    </Pressable>
  )
}

const STRIP_BORDER = 3

const useStyles = makeStyles(t => ({
  strip: {
    width: t.layout.railWidth,
    height: t.layout.serverStripHeight,
    backgroundColor: t.colors.line,
    borderBottomWidth: STRIP_BORDER,
    borderBottomColor: t.colors.inverseBackground,
  },
  // Banner de fondo; sin banner queda el color de la franja
  banner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // Ícono cuadrado a la izquierda. La línea lo separa de un banner claro
  icon: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRightWidth: t.lines.hairline,
    borderRightColor: t.colors.inverseBackground,
  },
  dimmed: { opacity: 0.4 },
  suspendedTag: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: [{ translateY: -8 }],
    alignItems: 'center',
  },
  suspendedText: {
    paddingHorizontal: t.space[1],
    backgroundColor: t.colors.danger,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  unread: {
    position: 'absolute',
    right: -1,
    top: '50%',
    marginTop: -t.space[1] / 2,
    width: t.space[1],
    height: t.space[1],
    backgroundColor: t.colors.inverseBackground,
  },
}))
