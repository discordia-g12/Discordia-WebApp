import React, { useEffect, useState } from 'react'
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { makeStyles, useTheme } from '../theme'
import { Text } from './Text'
import { easing, useNativeDriver, useReducedMotion } from './motion'

interface BlockButtonProps {
  children: string
  /** danger: acciones destructivas (el único lugar donde va el rojo). */
  tone?: 'default' | 'danger'
  /** large: formularios que ocupan la pantalla (acceso), a la par de UnderlineInput size="large". */
  size?: 'default' | 'large'
  /** Deshabilita el botón y muestra una línea de progreso. */
  loading?: boolean
  disabled?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Acción principal: bloque invertido (negro en claro) con el texto en mayúsculas y barra final. */
export function BlockButton({ children, tone = 'default', size = 'default', loading = false, disabled = false, onPress, style, testID }: BlockButtonProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const danger = tone === 'danger'
  const color = danger ? colors.onDanger : colors.inverseText

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        size === 'large' && styles.large,
        danger && styles.danger,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          <Text
            variant={size === 'large' ? 'body' : 'bodySmall'}
            style={[styles.label, { color }, pressed && styles.labelPressed]}
          >
            {children.toUpperCase()} /
          </Text>
          {loading && <Progress color={color} />}
        </>
      )}
    </Pressable>
  )
}

/** Cargando: una línea que recorre el pie del bloque. Quieta con movimiento reducido. */
function Progress({ color }: { color: string }) {
  const reduce = useReducedMotion()
  const [scale] = useState(() => new Animated.Value(reduce ? 1 : 0))
  useEffect(() => {
    if (reduce) return
    const loop = Animated.loop(
      Animated.timing(scale, { toValue: 1, duration: 1200, easing: easing('standard'), useNativeDriver }),
    )
    loop.start()
    return () => loop.stop()
  }, [reduce, scale])
  const [width, setWidth] = useState(0)
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '100%',
          height: 2,
          backgroundColor: color,
          opacity: reduce ? 0.6 : 1,
          // scaleX desde la izquierda: se corre la mitad del ancho que le falta
          transform: [
            { translateX: scale.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] }) },
            { scaleX: scale },
          ],
        }}
      />
    </View>
  )
}

const useStyles = makeStyles(t => ({
  button: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingVertical: t.space[3],
    paddingHorizontal: t.space[5],
    backgroundColor: t.colors.inverseBackground,
    borderRadius: t.radius,
  },
  large: { paddingVertical: t.space[4], paddingHorizontal: t.space[6] },
  danger: { backgroundColor: t.colors.danger },
  disabled: { opacity: 0.85 },
  pressed: { opacity: 0.9 },
  label: { lineHeight: undefined, letterSpacing: 0.3 },
  labelPressed: { transform: [{ translateX: 2 }] },
}))
