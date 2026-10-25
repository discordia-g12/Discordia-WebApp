import React from 'react'
import { Pressable, View } from 'react-native'
import { makeStyles } from '../theme'
import { Text } from './Text'

interface ChoiceProps<T extends string> {
  /** Nombre accesible del grupo. */
  label: string
  options: { value: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (value: T) => void
}

/**
 * Opciones excluyentes como palabras en una fila: la elegida en bloque negro (tema, estado, vencimiento).
 * Cada opción con su borde, superpuesto al de la vecina: si la fila no entra y se parte, sigue siendo una
 * grilla de líneas finas.
 */
export function Choice<T extends string>({ label, options, value, onChange }: ChoiceProps<T>) {
  const styles = useStyles()
  return (
    <View style={styles.choice} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(option => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={option.disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled: option.disabled }}
            style={[styles.option, active && styles.active, option.disabled && styles.disabled]}
          >
            <Text variant="bodySmall" tone={active ? 'inverse' : 'default'}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  choice: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', paddingRight: 1, paddingBottom: 1 },
  option: {
    marginRight: -1,
    marginBottom: -1,
    paddingVertical: t.space[2],
    paddingHorizontal: t.space[4],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
  },
  active: { backgroundColor: t.colors.inverseBackground },
  disabled: { opacity: 0.5 },
}))
