import React, { useEffect, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { makeStyles } from '../../theme'
import { Text, timing, useReducedMotion, useRise } from '../../ui'

interface MenuItem {
  label: string
  onSelect?: () => void
  /** Abandonar / eliminar: separado del resto con una línea. */
  separated?: boolean
  /** Junto al texto: "activo" en ordenar canales. */
  detail?: string
}

interface ServerMenuProps {
  /** Sin permiso para invitar, no se pasa y no aparece. */
  onInvite?: () => void
  items: MenuItem[]
}

/**
 * Arriba de los canales (PDF, pág. 7): "Invitar al servidor +" y "menú v", que despliega un panel de línea
 * fina con las acciones del servidor. Cada acción cierra el menú.
 */
export function ServerMenu({ onInvite, items }: ServerMenuProps) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [turn] = useState(() => new Animated.Value(0))
  useEffect(() => {
    timing(turn, open ? 1 : 0, { name: 'fast', reduce }).start()
  }, [open, reduce, turn])

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {onInvite && (
          <Pressable onPress={onInvite} accessibilityRole="button" accessibilityLabel="Invitar al servidor" hitSlop={8}>
            <Text variant="bodySmall">Invitar al servidor +</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setOpen(o => !o)}
          accessibilityRole="button"
          accessibilityLabel="Menú del servidor"
          accessibilityState={{ expanded: open }}
          hitSlop={8}
          style={styles.toggle}
        >
          <Text variant="bodySmall">menú </Text>
          <Animated.View style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
            <Text variant="bodySmall">v</Text>
          </Animated.View>
        </Pressable>
      </View>
      {open && <Panel items={items} onClose={() => setOpen(false)} />}
    </View>
  )
}

function Panel({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const styles = useStyles()
  const enter = useRise({ offset: -8, name: 'base' })
  return (
    <Animated.View style={[styles.panel, enter]} accessibilityRole="menu">
      {items
        .filter(item => item.onSelect)
        .map(item => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.item, item.separated && styles.separated, pressed && styles.pressed]}
            onPress={() => {
              onClose()
              item.onSelect?.()
            }}
            accessibilityRole="menuitem"
          >
            <Text variant="bodySmall">{item.label}</Text>
            {item.detail && (
              <Text variant="meta" tone="muted">
                {item.detail}/
              </Text>
            )}
          </Pressable>
        ))}
    </Animated.View>
  )
}

const useStyles = makeStyles(t => ({
  root: { borderBottomWidth: t.lines.hairline, borderBottomColor: t.colors.line },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: t.space[7], paddingHorizontal: t.space[5] },
  // A la derecha aunque no esté "Invitar al servidor"
  toggle: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  panel: { marginHorizontal: t.space[4], marginBottom: t.space[4], borderWidth: t.lines.hairline, borderColor: t.colors.lineStrong, backgroundColor: t.colors.background },
  item: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: t.space[3], paddingHorizontal: t.space[4] },
  separated: { borderTopWidth: t.lines.hairline, borderTopColor: t.colors.lineStrong },
  pressed: { backgroundColor: t.colors.line },
}))
