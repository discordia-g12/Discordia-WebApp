import React, { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { makeStyles } from '../theme'
import { Text } from './Text'
import { duration, easing, useReducedMotion } from './motion'

export interface TabItem<T extends string> {
  value: T
  label: string
  /** Contador entre paréntesis: "DISPONIBLE (0)". */
  count?: number
  disabled?: boolean
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** Nombre accesible del grupo. */
  label?: string
}

/**
 * Pestañas con subrayado que se desliza a la activa. Si no entran a lo ancho, siguen en otra fila: deslizar
 * la fila escondía las últimas sin ninguna pista (en un teléfono de 320 px, "Bloqueado" y "Añadir amigo").
 */
export function Tabs<T extends string>({ items, value, onChange, label }: TabsProps<T>) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const layouts = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({})
  const [left] = useState(() => new Animated.Value(0))
  const [top] = useState(() => new Animated.Value(0))
  const [width] = useState(() => new Animated.Value(0))
  const [ready, setReady] = useState(false)

  const moveTo = (target: T, animate: boolean) => {
    const box = layouts.current[target]
    if (!box) return
    const config = { duration: animate ? duration('fast', reduce) : 0, easing: easing('standard'), useNativeDriver: false }
    Animated.parallel([
      Animated.timing(left, { toValue: box.x, ...config }),
      // Debajo de la pestaña, en la fila que le toque
      Animated.timing(top, { toValue: box.y + box.height, ...config }),
      Animated.timing(width, { toValue: box.width, ...config }),
    ]).start()
    setReady(true)
  }

  useEffect(() => {
    moveTo(value, ready)
    // Solo al cambiar la pestaña elegida
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <View accessibilityRole="tablist" accessibilityLabel={label}>
      <View style={styles.list}>
        {items.map(item => {
          const selected = item.value === value
          const text = item.count !== undefined ? `${item.label} (${item.count})` : item.label
          return (
            <Pressable
              key={item.value}
              onPress={() => onChange(item.value)}
              disabled={item.disabled}
              accessibilityRole="tab"
              accessibilityLabel={text}
              accessibilityState={{ selected, disabled: item.disabled }}
              onLayout={e => {
                const { x, y, width: w, height: h } = e.nativeEvent.layout
                layouts.current[item.value] = { x, y, width: w, height: h }
                if (selected) moveTo(item.value, false)
              }}
              style={styles.tab}
            >
              <Text variant="bodySmall" bold={selected} tone={item.disabled ? 'muted' : 'default'}>
                {text.toUpperCase()}
              </Text>
              {/* Reserva el ancho de la versión en negrita: al cambiar de pestaña las demás no se corren */}
              <Text variant="bodySmall" bold style={styles.reserve} importantForAccessibility="no" accessibilityElementsHidden>
                {text.toUpperCase()}
              </Text>
            </Pressable>
          )
        })}
        <Animated.View style={[styles.underline, { left, top, width, opacity: ready ? 1 : 0 }]} />
      </View>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  list: { flexDirection: 'row', flexWrap: 'wrap', columnGap: t.space[6], rowGap: t.space[1], paddingBottom: t.lines.underline },
  tab: { paddingVertical: t.space[1] },
  reserve: { height: 0, opacity: 0, overflow: 'hidden' },
  underline: { position: 'absolute', height: t.lines.underline, backgroundColor: t.colors.lineStrong },
}))
