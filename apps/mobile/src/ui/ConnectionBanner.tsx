import React, { useEffect, useState } from 'react'
import { Animated, Easing, View } from 'react-native'
import { makeStyles } from '../theme'
import { useNativeDriver, useReducedMotion } from './motion'

/** Línea de 2 px arriba de toda la app que avanza en loop mientras se reconecta (con movimiento reducido, quieta). */
export function ConnectionBanner({ active }: { active: boolean }) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const [width, setWidth] = useState(0)
  const [progress] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (!active || reduce) return
    progress.setValue(0)
    const loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver }))
    loop.start()
    return () => loop.stop()
  }, [active, reduce, progress])

  if (!active) return null
  return (
    <View
      style={styles.track}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Reconectando"
      accessibilityLiveRegion="polite"
    >
      <Animated.View
        style={[
          styles.bar,
          reduce
            ? { width: '100%', opacity: 0.6 }
            : { width: width / 3, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-width / 3, width] }) }] },
        ]}
      />
    </View>
  )
}

const useStyles = makeStyles(t => ({
  track: { position: 'absolute', top: 0, left: 0, right: 0, height: t.lines.focus, overflow: 'hidden', zIndex: 1000 },
  bar: { height: '100%', backgroundColor: t.colors.lineStrong },
}))
