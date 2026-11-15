import React from 'react'
import { Pressable, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { makeStyles, useTheme } from '../theme'
import { Text } from './Text'

interface IconButtonProps {
  /** Componente de lucide (ver ui/icons para las acciones del chat). */
  icon: LucideIcon
  /** Nombre accesible: en el teléfono no hay tooltip, es lo único que dice qué hace. */
  label: string
  onPress?: () => void
  /** Activo (un panel abierto): el bloque invertido, como un interruptor encendido. */
  pressed?: boolean
  disabled?: boolean
  /** Cantidad sobre el ícono (mensajes fijados). */
  badge?: number
  /** danger: acciones destructivas (el ícono en rojo). */
  tone?: 'default' | 'danger'
}

/**
 * Acción de un encabezado como ícono: un cuadrado del alto del encabezado (48, más que los 44 pt mínimos de
 * toque), separado del anterior por una línea fina. Mismo nombre y props que el de la web. Radio 0 y sin
 * sombras: la idea de Discord (acciones como íconos) sin su estética (ADR-02).
 */
export function IconButton({ icon: Icon, label, onPress, pressed = false, disabled = false, badge, tone = 'default' }: IconButtonProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const color = pressed ? colors.inverseText : tone === 'danger' ? colors.danger : colors.text

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label} (${badge})` : label}
      accessibilityState={{ disabled, selected: pressed }}
      style={({ pressed: touching }) => [
        styles.button,
        pressed && styles.on,
        touching && !pressed && styles.touching,
        disabled && styles.disabled,
      ]}
    >
      <Icon color={color} size={18} strokeWidth={1.5} />
      {badge ? (
        <View style={styles.badge} pointerEvents="none">
          <Text variant="meta" tone="inverse" bold>
            {badge > 99 ? '99+' : String(badge)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const useStyles = makeStyles(t => ({
  button: {
    width: t.space[7],
    alignSelf: 'stretch',
    minHeight: t.space[7],
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: t.lines.hairline,
    borderLeftColor: t.colors.line,
  },
  on: { backgroundColor: t.colors.inverseBackground },
  touching: { backgroundColor: t.colors.line },
  disabled: { opacity: 0.4 },
  // Cuadrado chico invertido en la esquina, como los no leídos de la lista de chats
  badge: {
    position: 'absolute',
    top: t.space[1],
    right: t.space[1],
    minWidth: t.space[3],
    paddingHorizontal: t.space[1],
    alignItems: 'center',
    backgroundColor: t.colors.inverseBackground,
  },
}))
