import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native'
import { distances, durations, easings, reducedMotion } from '@discordia/tokens'

/**
 * Movimiento del rediseño (docs/TODO-REDISENO.md, sección 2) con Animated: solo transform y opacity. Con
 * "reducir movimiento" del sistema, todo pasa a fundidos de 150 ms sin desplazamientos.
 */

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled().then(value => alive && setReduce(value))
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)
    return () => {
      alive = false
      sub.remove()
    }
  }, [])
  return reduce
}

export type DurationName = keyof typeof durations
export type EasingName = keyof typeof easings

export const easing = (name: EasingName) => {
  const [x1, y1, x2, y2] = easings[name]
  return Easing.bezier(x1, y1, x2, y2)
}

/** Duración en ms del token, acortada con movimiento reducido. */
export const duration = (name: DurationName, reduce: boolean) =>
  reduce ? reducedMotion.durations[name] : durations[name]

/** Desplazamiento en px del token (0 con movimiento reducido). */
export const distance = (name: keyof typeof distances, reduce: boolean) =>
  reduce ? reducedMotion.distances[name] : distances[name]

// En web (react-native-web) no hay driver nativo: Animated avisa y anima en JS
export const useNativeDriver = Platform.OS !== 'web'

/** Animated.timing con las duraciones y curvas de los tokens. */
export function timing(
  value: Animated.Value,
  toValue: number,
  { name = 'base', curve = 'standard', reduce = false, delay = 0 }: {
    name?: DurationName
    curve?: EasingName
    reduce?: boolean
    delay?: number
  } = {},
) {
  return Animated.timing(value, {
    toValue,
    duration: duration(name, reduce),
    easing: easing(curve),
    delay: reduce ? 0 : delay,
    useNativeDriver,
  })
}

/**
 * Entrada que sube (formularios, mensajes nuevos, estados vacíos): opacidad y desplazamiento desde
 * abajo, con un retraso para escalonar. axis 'x': entra de costado (barrido de la marca de agua).
 * Devuelve el estilo para un Animated.View.
 */
export function useRise({
  delay = 0,
  offset = 16,
  name = 'slow' as DurationName,
  enabled = true,
  axis = 'y' as 'x' | 'y',
} = {}) {
  const reduce = useReducedMotion()
  const [progress] = useState(() => new Animated.Value(enabled ? 0 : 1))
  useEffect(() => {
    if (!enabled) return
    const animation = timing(progress, 1, { name, curve: 'enter', reduce, delay })
    animation.start()
    return () => animation.stop()
    // Solo al montarse: es una entrada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const shift = progress.interpolate({ inputRange: [0, 1], outputRange: [reduce ? 0 : offset, 0] })
  return {
    opacity: progress,
    transform: axis === 'x' ? [{ translateX: shift }] : [{ translateY: shift }],
  }
}
