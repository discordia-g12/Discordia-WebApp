import React from 'react'
import { Animated, View } from 'react-native'
import { makeStyles } from '../theme'
import { ActionLink } from './ActionLink'
import { Text } from './Text'
import { distance, useReducedMotion, useRise } from './motion'

interface ToastProps {
  /** Se muestra con barra final: "Mensaje enviado/". */
  message: string
  /** error: borde izquierdo rojo de 4 px. */
  tone?: 'default' | 'error'
  /** Acción en el toast (p. ej. reintentar un envío). */
  action?: { label: string; onPress: () => void }
}

/** Aviso: tira negra con texto claro que entra desde abajo. Cuánto dura y dónde va lo decide quien lo muestra. */
export function Toast({ message, tone = 'default', action }: ToastProps) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const enter = useRise({ offset: distance('toast', reduce), name: 'base' })
  return (
    <Animated.View
      style={[styles.toast, tone === 'error' && styles.error, enter]}
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.message}>
        <Text variant="bodySmall" tone="inverse">
          {message}/
        </Text>
      </View>
      {action && (
        <ActionLink tone="inverse" size="bodySmall" onPress={action.onPress}>
          {action.label}
        </ActionLink>
      )}
    </Animated.View>
  )
}

const useStyles = makeStyles(t => ({
  toast: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: t.space[5],
    paddingVertical: t.space[3],
    paddingHorizontal: t.space[5],
    backgroundColor: t.colors.inverseBackground,
  },
  error: { borderLeftWidth: t.lines.accent, borderLeftColor: t.colors.danger },
  message: { flex: 1 },
}))
