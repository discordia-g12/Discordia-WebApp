import React, { useEffect, useRef, useState } from 'react'
import { Animated, PanResponder, View } from 'react-native'
import { Reply } from 'lucide-react-native'
import { makeStyles, useTheme } from '../../theme'
import { useReducedMotion } from '../../ui'

/** Cuánto hay que deslizar para responder (puntos). */
export const SWIPE_REPLY_THRESHOLD = 56
/** Hasta dónde sigue al dedo: pasado el umbral se frena (resistencia), como en WhatsApp. */
const MAX_TRANSLATE = 80
/** Un gesto que empieza pegado al borde izquierdo es el "atrás" del sistema (iOS), no una respuesta. */
const EDGE = 24

/**
 * Deslizar el mensaje hacia la derecha para responderlo. La fila sigue al dedo y la flecha aparece de a poco;
 * al soltar pasado el umbral responde, y en cualquier caso vuelve a su lugar. Solo toma gestos claramente
 * horizontales: el scroll vertical de la lista y el mantener presionado siguen funcionando.
 */
export default function SwipeToReply({ onReply, children }: { onReply: () => void; children: React.ReactNode }) {
  const styles = useStyles()
  const { colors } = useTheme()
  const reduce = useReducedMotion()
  const [dx] = useState(() => new Animated.Value(0))

  // Los handlers del PanResponder se crean una vez: leen lo último por refs
  const onReplyRef = useRef(onReply)
  const reduceRef = useRef(reduce)
  useEffect(() => {
    onReplyRef.current = onReply
    reduceRef.current = reduce
  })

  // Las refs se leen solo en los handlers del gesto, no al renderizar. Recrearlo en cada render cortaría el gesto
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    const settle = () => {
      if (reduceRef.current) dx.setValue(0)
      else Animated.spring(dx, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start()
    }
    return PanResponder.create({
      // En captura, para ganarle a los Pressable de adentro; solo si es hacia la derecha y bien horizontal
      onMoveShouldSetPanResponderCapture: (_e, g) => g.x0 > EDGE && g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_e, g) => dx.setValue(Math.max(0, g.dx)),
      // Una vez tomado, la lista no se lo lleva a mitad del gesto
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_e, g) => {
        if (g.dx >= SWIPE_REPLY_THRESHOLD) onReplyRef.current()
        settle()
      },
      onPanResponderTerminate: settle,
    })
  })

  const translateX = dx.interpolate({
    inputRange: [0, SWIPE_REPLY_THRESHOLD, SWIPE_REPLY_THRESHOLD + 200],
    outputRange: [0, SWIPE_REPLY_THRESHOLD, MAX_TRANSLATE],
    extrapolate: 'clamp',
  })
  const iconOpacity = dx.interpolate({ inputRange: [8, SWIPE_REPLY_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' })
  // Crece hasta el umbral y salta un poco al pasarlo: así se nota que al soltar va a responder
  const iconScale = dx.interpolate({
    inputRange: [0, SWIPE_REPLY_THRESHOLD - 1, SWIPE_REPLY_THRESHOLD],
    outputRange: [0.5, 0.9, 1.15],
    extrapolate: 'clamp',
  })

  return (
    <View {...responder.panHandlers}>
      <Animated.View
        style={[styles.icon, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Reply size={20} color={colors.accent} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  icon: { position: 'absolute', left: t.space[2], top: 0, bottom: 0, justifyContent: 'center' },
}))
