import React, { useEffect, useState } from 'react'
import { Animated, Easing, View, type DimensionValue } from 'react-native'
import { makeStyles } from '../theme'
import { useNativeDriver, useReducedMotion } from './motion'

interface SkeletonProps {
  /** Cantidad de líneas. */
  lines?: number
  /** Nombre accesible de lo que está cargando. */
  label?: string
}

// Anchos que se repiten para que las líneas no queden todas iguales
const WIDTHS: DimensionValue[] = ['92%', '64%', '78%', '48%', '85%', '57%']

/** Carga: barras horizontales finas que laten, nunca un spinner sobre fondo vacío. */
export function Skeleton({ lines = 3, label = 'Cargando' }: SkeletonProps) {
  const styles = useStyles()
  return (
    <View style={styles.root} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      {Array.from({ length: lines }, (_, i) => (
        <Line key={i} width={WIDTHS[i % WIDTHS.length]} delay={i * 120} />
      ))}
    </View>
  )
}

function Line({ width, delay }: { width: DimensionValue; delay: number }) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const [opacity] = useState(() => new Animated.Value(0.25))
  useEffect(() => {
    if (reduce) return
    const half = { duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 0.08, ...half }),
        Animated.timing(opacity, { toValue: 0.25, ...half }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [delay, opacity, reduce])
  return <Animated.View style={[styles.line, { width, opacity }]} />
}

const useStyles = makeStyles(t => ({
  root: { gap: t.space[3] },
  line: { height: t.lines.focus, backgroundColor: t.colors.lineStrong },
}))
