import React from 'react'
import { Pressable, type StyleProp, type TextStyle } from 'react-native'
import { Text, type TextTone } from './Text'

interface ActionLinkProps {
  /** Texto sin el guion bajo: "editar" se muestra como "_editar". */
  children: string
  onPress?: () => void
  disabled?: boolean
  /** Sobre un bloque invertido (toasts): inverse. */
  tone?: TextTone
  size?: 'meta' | 'bodySmall'
  style?: StyleProp<TextStyle>
  accessibilityLabel?: string
}

/** Acción secundaria en texto chico con guion bajo inicial (_editar, _mostrar, _reintentar). */
export function ActionLink({ children, onPress, disabled = false, tone = 'default', size = 'meta', style, accessibilityLabel }: ActionLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled }}
    >
      {({ pressed }) => (
        <Text
          variant={size}
          tone={disabled ? 'muted' : tone}
          style={[pressed && { textDecorationLine: 'underline' }, style]}
        >
          _{children}
        </Text>
      )}
    </Pressable>
  )
}
