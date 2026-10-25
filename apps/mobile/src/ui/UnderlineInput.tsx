import React, { forwardRef, useState } from 'react'
import { Pressable, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native'
import { Eye, EyeOff } from 'lucide-react-native'
import { makeStyles, useTheme } from '../theme'
import { Text } from './Text'
import { noWebOutline } from './platform'

interface UnderlineInputProps extends Omit<TextInputProps, 'secureTextEntry' | 'style'> {
  label: string
  required?: boolean
  /** Ayuda bajo el campo (texto chico). */
  hint?: string
  /** Error de validación: reemplaza a la ayuda y marca el campo como inválido. */
  error?: string
  /** Contraseña: oculta el texto y suma un ojo para mostrarlo / ocultarlo. */
  secret?: boolean
  /** large: formularios que son toda la pantalla (acceso), con letra y alto mayores. */
  size?: 'default' | 'large'
  disabled?: boolean
}

/**
 * Campo de formulario del rediseño: etiqueta en negrita, el texto entre dos líneas finas y la ayuda o el
 * error abajo, con barra inicial.
 */
export const UnderlineInput = forwardRef<TextInputInstance, UnderlineInputProps>(function UnderlineInput(
  { label, required = false, hint, error, secret = false, size = 'default', disabled = false, onFocus, onBlur, ...inputProps },
  ref,
) {
  const styles = useStyles()
  const { colors } = useTheme()
  const [revealed, setRevealed] = useState(false)
  const [focused, setFocused] = useState(false)
  const large = size === 'large'
  const message = error ?? hint
  const EyeIcon = revealed ? EyeOff : Eye

  return (
    <View style={[styles.root, large && styles.rootLarge]}>
      <Text variant={large ? 'body' : 'label'} bold style={styles.label}>
        {label}
        {required && <Text variant="meta"> *</Text>}
      </Text>
      <View>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            large && styles.inputLarge,
            secret && (large ? styles.withToggleLarge : styles.withToggle),
            focused && styles.focused,
            !!error && styles.invalid,
          ]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.text}
          secureTextEntry={secret && !revealed}
          editable={!disabled}
          accessibilityLabel={label}
          accessibilityHint={message}
          aria-invalid={error ? true : undefined}
          onFocus={e => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={e => {
            setFocused(false)
            onBlur?.(e)
          }}
          {...inputProps}
        />
        {secret && (
          <Pressable
            style={styles.toggle}
            onPress={() => setRevealed(v => !v)}
            disabled={disabled}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityState={{ selected: revealed }}
          >
            <EyeIcon size={large ? 20 : 16} strokeWidth={1.5} color={revealed ? colors.text : colors.textMuted} />
          </Pressable>
        )}
      </View>
      {message && (
        <Text variant={large ? 'bodySmall' : 'meta'} tone={error ? 'default' : 'muted'} bold={!!error} accessibilityLiveRegion={error ? 'polite' : 'none'}>
          / {message}
        </Text>
      )}
    </View>
  )
})

const useStyles = makeStyles(t => ({
  root: { gap: t.space[1] },
  rootLarge: { gap: t.space[2] },
  label: { textTransform: 'none' },
  input: {
    ...t.text.bodySmall,
    color: t.colors.text,
    paddingVertical: t.space[1],
    paddingHorizontal: t.space[5],
    borderTopWidth: t.lines.hairline,
    borderBottomWidth: t.lines.hairline,
    borderColor: t.colors.line,
    borderRadius: t.radius,
    ...noWebOutline,
  },
  inputLarge: { ...t.text.heading, fontFamily: t.fonts[400], paddingVertical: t.space[3] },
  withToggle: { paddingRight: t.space[5] * 2 },
  withToggleLarge: { paddingRight: t.space[5] + t.space[6] },
  focused: { borderColor: t.colors.lineStrong },
  invalid: { borderBottomColor: t.colors.lineStrong, borderBottomWidth: t.lines.focus },
  toggle: { position: 'absolute', right: t.space[2], top: 0, bottom: 0, justifyContent: 'center', padding: t.space[1] },
}))
