import React, { useEffect, useState } from 'react'
import { Animated, Image, Pressable, View } from 'react-native'
import { makeStyles } from '../theme'
import { Text } from './Text'
import { timing, useReducedMotion } from './motion'

interface ServerStripProps {
  server: { name: string; iconUrl?: string | null; icon?: string | null; banner?: string | null }
  active?: boolean
  /** Actividad nueva: una marca en la franja. */
  unread?: string | boolean
  onPress?: () => void
  /**
   * horizontal: la tira de servidores de arriba (la única en mobile). La activa baja hacia el contenido.
   * En táctil no hay etiqueta flotante: el nombre está en el encabezado de la pantalla.
   */
  orientation?: 'vertical' | 'horizontal'
}

/** Servidor como franja rectangular con su imagen. */
export function ServerStrip({ server, active = false, unread, onPress, orientation = 'horizontal' }: ServerStripProps) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const [shift] = useState(() => new Animated.Value(active ? 1 : 0))
  useEffect(() => {
    timing(shift, active ? 1 : 0, { name: 'fast', reduce }).start()
  }, [active, reduce, shift])

  const horizontal = orientation === 'horizontal'
  const image = server.banner || server.iconUrl || server.icon
  const offset = shift.interpolate({ inputRange: [0, 1], outputRange: [0, horizontal ? 4 : 8] })
  const activity = typeof unread === 'string' ? unread : unread ? 'actividad nueva' : null

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
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text variant="label">{server.name.slice(0, 2)}</Text>
          </View>
        )}
        {!!unread && <View style={styles.unread} />}
      </Animated.View>
    </Pressable>
  )
}

const useStyles = makeStyles(t => ({
  strip: {
    width: t.layout.railWidth,
    height: t.layout.serverStripHeight,
    backgroundColor: t.colors.line,
    borderBottomWidth: 3,
    borderBottomColor: t.colors.inverseBackground,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
