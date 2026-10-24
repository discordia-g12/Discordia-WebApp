import React, { useEffect, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native'
import { durations } from '@discordia/tokens'
import { useTheme } from '../theme'
import { Background, GradientFill, Logo, easing, useNativeDriver, useReducedMotion } from '../ui'
import { readPreference, writePreference } from '../utils/storage'

/**
 * Intro "amanecer" (docs/TODO-REDISENO.md, sección 2), igual que la de la web: noche → el resplandor
 * celeste sube (gradiente 1 → 2) con la "D" que aparece y se pierde → se aclara hasta el fondo del
 * login. ~4 s, se saltea tocando, sale solo la primera vez en el dispositivo y se omite con "reducir
 * movimiento".
 */

const SEEN_KEY = 'discordia_intro_seen'
// Subida y aclarado con entrada y salida suaves (la curva de entrada resuelve casi todo al principio)
const RISE = Easing.bezier(0.65, 0, 0.35, 1)

export function DawnIntro() {
  const theme = useTheme()
  const reduce = useReducedMotion()
  // null: todavía no se sabe si ya se vio (se lee del storage)
  const [playing, setPlaying] = useState<boolean | null>(null)
  const [height, setHeight] = useState(800)
  const [values] = useState(() => ({
    dawn: new Animated.Value(0),
    day: new Animated.Value(0),
    logo: new Animated.Value(0),
    out: new Animated.Value(1),
  }))

  useEffect(() => {
    readPreference(SEEN_KEY).then(seen => setPlaying(seen !== '1'))
  }, [])

  const finish = () => {
    Animated.timing(values.out, {
      toValue: 0,
      duration: durations.curtain,
      easing: easing('exit'),
      useNativeDriver,
    }).start(() => setPlaying(false))
  }

  useEffect(() => {
    if (!playing) return
    if (reduce) {
      setPlaying(false)
      return
    }
    writePreference(SEEN_KEY, '1')
    const total = durations.intro
    const timing = (value: Animated.Value, toValue: number, ms: number, delay: number, curve = RISE) =>
      Animated.timing(value, { toValue, duration: ms, delay, easing: curve, useNativeDriver })
    const animation = Animated.parallel([
      timing(values.dawn, 1, total * 0.625, total * 0.125),
      timing(values.day, 1, total * 0.275, total * 0.7),
      // La "D": aparece con el resplandor (hasta 1) y se pierde cuando aclara (hasta 2)
      timing(values.logo, 2, total * 0.7, total * 0.1, Easing.linear),
    ])
    animation.start(({ finished }) => finished && finish())
    return () => animation.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, reduce])

  if (!playing || reduce) return null

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.intro, { opacity: values.out }]}
      onLayout={e => setHeight(e.nativeEvent.layout.height)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={finish}>
        {/* Primer cuadro: noche con el resplandor en los bordes de abajo */}
        <GradientFill gradient={theme.gradients.intro.night} />
        {/*
          El resplandor sube y llena la pantalla: arranca un 20% más abajo. La capa es 1.5 veces el alto,
          sobrando hacia arriba en negro (el centro del degradé): al subir, su borde nunca entra en pantalla.
        */}
        <Animated.View
          style={[
            styles.dawn,
            {
              opacity: values.dawn,
              transform: [{ translateY: values.dawn.interpolate({ inputRange: [0, 1], outputRange: [height * 0.2, 0] }) }],
            },
          ]}
        >
          <View style={styles.night} />
          <View style={styles.dawnGradient}>
            <GradientFill gradient={theme.gradients.intro.dawn} />
          </View>
        </Animated.View>
        {/* Se aclara hasta el fondo del login, que es lo que queda debajo al salir */}
        <Animated.View style={[styles.layer, { opacity: values.day }]}>
          <Background gradient="backgroundGlow" />
        </Animated.View>
        <Animated.View
          style={[
            styles.logo,
            {
              opacity: values.logo.interpolate({ inputRange: [0, 0.9, 2], outputRange: [0, 1, 0] }),
              transform: [{ translateY: values.logo.interpolate({ inputRange: [0, 0.9, 2], outputRange: [12, 0, 0] }) }],
            },
          ]}
        >
          <Logo size={56} color={theme.colors.glow} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  // Negro fijo a propósito: la intro es de noche en los dos temas
  intro: { zIndex: 2000, backgroundColor: '#000' },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dawn: { position: 'absolute', top: '-50%', left: 0, right: 0, bottom: 0 },
  night: { flex: 1, backgroundColor: '#000' },
  dawnGradient: { flex: 2 },
  logo: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
})
