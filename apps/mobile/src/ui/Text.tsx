import React from 'react'
import { Text as RNText, type TextProps as RNTextProps } from 'react-native'
import type { TextStyleName } from '@discordia/tokens'
import { useTheme } from '../theme'

export type TextTone = 'default' | 'muted' | 'displayInactive' | 'inverse' | 'onDanger'

export interface TextProps extends RNTextProps {
  /** Escala tipográfica de los tokens: watermark y display (gigantes), heading, body, bodySmall, label, meta. */
  variant?: TextStyleName
  tone?: TextTone
  /** Negrita (en React Native cada peso es otra familia: no se usa fontWeight). */
  bold?: boolean
}

/** Texto del rediseño: Schibsted Grotesk en la escala de los tokens y en el color del tema. */
export function Text({ variant = 'body', tone = 'default', bold = false, style, ...rest }: TextProps) {
  const theme = useTheme()
  const { colors } = theme
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    displayInactive: colors.textDisplayInactive,
    inverse: colors.inverseText,
    onDanger: colors.onDanger,
  }[tone]
  return (
    <RNText
      style={[theme.text[variant], { color }, bold && { fontFamily: theme.fonts[700] }, style]}
      {...rest}
    />
  )
}
