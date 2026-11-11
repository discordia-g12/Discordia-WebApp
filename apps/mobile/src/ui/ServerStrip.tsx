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
  /** El staff suspendió el servidor: sigue en la tira, con un cartel rojo "suspended". */
  suspended?: boolean
}

/** Servidor como franja rectangular con su imagen. */
export function ServerStrip({ server, active = false, unread, onPress, orientation = 'horizontal', suspended = false }: ServerStripProps) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const [shift] = useState(() => new Animated.Value(active ? 1 : 0))
  useEffect(() => {
    timing(shift, active ? 1 : 0, { name: 'fast', reduce }).start()
  }, [active, reduce, shift])

  const horizontal = orientation === 'horizontal'
  const image = server.banner || server.iconUrl || server.icon
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
        {image ? (
          <Image source={{ uri: image }} style={[styles.image, suspended && styles.dimmed]} />
        ) : (
          <View style={[styles.placeholder, suspended && styles.dimmed]}>
            <Text variant="label">{server.name.slice(0, 2)}</Text>
          </View>
        )}
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
