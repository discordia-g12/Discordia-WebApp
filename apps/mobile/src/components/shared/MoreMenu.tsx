import React, { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Ellipsis, type LucideIcon } from 'lucide-react-native'
import { makeStyles, useTheme } from '../../theme'
import { IconButton, Modal, Text } from '../../ui'

export interface MoreMenuItem {
  key: string
  label: string
  icon: LucideIcon
  /** Eliminar, bloquear: en rojo (y la acción pide confirmación). */
  destructive?: boolean
  disabled?: boolean
  onSelect: () => void
}

/**
 * Botón "más" de un encabezado (Ellipsis) con las acciones que no entran como ícono o se usan poco. Se abre
 * como el Modal del rediseño (la cortina): cada ítem con su ícono y el texto, separados por líneas finas.
 * Elegir uno cierra el menú.
 */
export function MoreMenu({ items, label = 'Más opciones' }: { items: MoreMenuItem[]; label?: string }) {
  const styles = useStyles()
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <>
      <IconButton icon={Ellipsis} label={label} pressed={open} onPress={() => setOpen(true)} />
      <Modal visible={open} title={label} onClose={() => setOpen(false)}>
        <View style={styles.list} accessibilityRole="menu">
          {items.map(item => {
            const color = item.destructive ? colors.danger : colors.text
            return (
              <Pressable
                key={item.key}
                disabled={item.disabled}
                onPress={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
                accessibilityState={{ disabled: item.disabled }}
                style={({ pressed }) => [styles.item, pressed && styles.pressed, item.disabled && styles.disabled]}
              >
                <item.icon color={color} size={18} strokeWidth={1.5} />
                <Text variant="bodySmall" style={item.destructive ? styles.danger : undefined}>
                  {item.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </Modal>
    </>
  )
}

const useStyles = makeStyles(t => ({
  list: { borderTopWidth: t.lines.hairline, borderTopColor: t.colors.lineStrong },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.space[7],
    paddingHorizontal: t.space[2],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.lineStrong,
  },
  pressed: { backgroundColor: t.colors.line },
  disabled: { opacity: 0.4 },
  danger: { color: t.colors.danger },
}))
