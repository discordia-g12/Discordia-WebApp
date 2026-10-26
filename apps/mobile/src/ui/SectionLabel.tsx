import React, { useEffect, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { makeStyles } from '../theme'
import { Text } from './Text'
import { timing, useReducedMotion } from './motion'

interface SectionLabelProps {
  children: string
  /** Muestra la "v" para colapsar la sección (categorías de canales). */
  collapsible?: boolean
  open?: boolean
  onToggle?: () => void
  /** Algo al final de la fila (el + de una categoría). */
  trailing?: React.ReactNode
}

/** Título de sección con barra final ("CANAL DE TEXTO /") y la línea de la grilla debajo, de borde a borde. */
export function SectionLabel({ children, collapsible = false, open = true, onToggle, trailing }: SectionLabelProps) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const [turn] = useState(() => new Animated.Value(open ? 0 : 1))
  useEffect(() => {
    timing(turn, open ? 0 : 1, { name: 'fast', reduce }).start()
  }, [open, reduce, turn])

  const label = (
    <View style={styles.label}>
      <Text variant="label">{children} /</Text>
      {collapsible && (
        <Animated.Text
          style={[styles.chevron, { transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-90deg'] }) }] }]}
        >
          v
        </Animated.Text>
      )}
    </View>
  )

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {collapsible ? (
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityLabel={children}
            accessibilityState={{ expanded: open }}
            hitSlop={8}
          >
            {label}
          </Pressable>
        ) : (
          <View accessibilityRole="header">{label}</View>
        )}
        {trailing}
      </View>
      <View style={styles.line} />
    </View>
  )
}

const useStyles = makeStyles(t => ({
  root: { gap: t.space[1] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: t.space[5], paddingRight: t.space[4] },
  label: { flexDirection: 'row', alignItems: 'baseline', gap: t.space[2] },
  chevron: { ...t.text.label, textTransform: 'none', fontFamily: t.fonts[400], color: t.colors.text },
  line: { height: t.lines.hairline, backgroundColor: t.colors.lineStrong, opacity: 0.6 },
}))
