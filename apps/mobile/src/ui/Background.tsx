import React, { useEffect, useId, useState } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'
import type { Gradient } from '@discordia/tokens'
import { useTheme } from '../theme'
import { duration, useNativeDriver, useReducedMotion } from './motion'

interface BackgroundProps {
  /** background: el cielo de la app. backgroundGlow: el resplandor de acceso. */
  gradient?: 'background' | 'backgroundGlow'
  /** Deriva muy lenta (60 s), solo transform. Quieta con movimiento reducido. */
  drift?: boolean
}

/** Fondo del rediseño: el degradé del tema detrás de toda la pantalla. */
export function Background({ gradient = 'background', drift = false }: BackgroundProps) {
  const theme = useTheme()
  const reduce = useReducedMotion()
  const [progress] = useState(() => new Animated.Value(0))
  const animate = drift && !reduce

  useEffect(() => {
    if (!animate) return
    // Ida y vuelta, como el alternate de la web
    const half = duration('drift', false)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver }),
        Animated.timing(progress, { toValue: 0, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [animate, progress])

  const transform = animate
    ? [
        { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] }) },
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 12] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
      ]
    : undefined

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]} pointerEvents="none">
      <Animated.View style={[styles.layer, drift && styles.bleed, transform && { transform }]}>
        <GradientFill gradient={theme.gradients[gradient]} />
      </Animated.View>
    </View>
  )
}

/** Un degradé de los tokens dibujado a toda la caja (también lo usa la intro). */
export function GradientFill({ gradient }: { gradient: Gradient }) {
  const id = `g${useId().replace(/:/g, '')}`
  const stops = gradient.stops.map(({ color, at }, i) => {
    const { hex, opacity } = splitAlpha(color)
    return <Stop key={i} offset={at} stopColor={hex} stopOpacity={opacity} />
  })
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        {gradient.type === 'linear' ? (
          // Solo se usan degradés verticales (180°: de arriba hacia abajo)
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {stops}
          </LinearGradient>
        ) : (
          // Elipse con r y una escala vertical: rx / ry son de react-native-svg y el SVG de la web los ignora.
          // En unidades de la caja, r ya es fracción del ancho en x y del alto en y.
          <RadialGradient
            id={id}
            cx={gradient.cx}
            cy={gradient.cy}
            fx={gradient.cx}
            fy={gradient.cy}
            r={gradient.rx}
            gradientTransform={`translate(0 ${gradient.cy}) scale(1 ${gradient.ry / gradient.rx}) translate(0 ${-gradient.cy})`}
          >
            {stops}
          </RadialGradient>
        )}
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  )
}

/** rgba(r, g, b, a) → color sin alfa y opacidad (stopColor con alfa no anda igual en todas las plataformas). */
function splitAlpha(color: string): { hex: string; opacity: number } {
  const match = color.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/)
  if (!match) return { hex: color, opacity: 1 }
  return { hex: `rgb(${match[1]}, ${match[2]}, ${match[3]})`, opacity: Number(match[4]) }
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // Con deriva, el degradé es más grande que la pantalla: al moverse no se ven los bordes
  bleed: { top: '-15%', bottom: '-15%', left: '-15%', right: '-15%' },
})
