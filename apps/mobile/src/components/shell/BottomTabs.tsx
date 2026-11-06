import React from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, Hash, User as UserIcon, Users, type LucideIcon } from 'lucide-react-native'
import { makeStyles, useTheme } from '../../theme'
import { Text } from '../../ui'

export type ShellTab = 'servers' | 'messages' | 'notifications' | 'profile'

// Los nombres de la web ("Amigos" es el inicio). "Notificaciones" no entra en un cuarto de pantalla: abajo dice
// "Avisos" y el título de la pantalla, "Notificaciones". Lo mismo "Perfil" / "Mi perfil".
const TABS: { id: ShellTab; label: string; icon: LucideIcon }[] = [
  { id: 'servers', label: 'Servidores', icon: Hash },
  { id: 'messages', label: 'Amigos', icon: Users },
  { id: 'notifications', label: 'Avisos', icon: Bell },
  { id: 'profile', label: 'Perfil', icon: UserIcon },
]

/** Barra inferior: cuatro secciones separadas por líneas; la activa, en bloque invertido. */
export function BottomTabs({
  value,
  onChange,
  unread,
}: {
  value: ShellTab
  onChange: (tab: ShellTab) => void
  /** Pestañas con algo sin leer: un cuadrado sobre el ícono. */
  unread?: Partial<Record<ShellTab, boolean>>
}) {
  const styles = useStyles()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {TABS.map(({ id, label, icon: Icon }, i) => {
        const active = id === value
        return (
          <Pressable
            key={id}
            style={[styles.tab, i > 0 && styles.divider, active && styles.active]}
            onPress={() => onChange(id)}
            accessibilityRole="tab"
            accessibilityLabel={unread?.[id] ? `${label}, hay novedades` : label}
            accessibilityState={{ selected: active }}
          >
            <View>
              <Icon color={active ? colors.inverseText : colors.textMuted} size={18} strokeWidth={1.5} />
              {unread?.[id] && <View style={[styles.dot, active && styles.dotActive]} />}
            </View>
            <Text variant="meta" tone={active ? 'inverse' : 'muted'} bold={active} style={styles.label}>
              {label.toUpperCase()}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  bar: { flexDirection: 'row', borderTopWidth: t.lines.hairline, borderTopColor: t.colors.lineStrong },
  tab: { flex: 1, height: t.layout.userBarHeight, alignItems: 'center', justifyContent: 'center', gap: 2 },
  divider: { borderLeftWidth: t.lines.hairline, borderLeftColor: t.colors.line },
  active: { backgroundColor: t.colors.inverseBackground },
  label: { letterSpacing: 0.2 },
  dot: { position: 'absolute', top: -2, right: -4, width: t.space[2], height: t.space[2], backgroundColor: t.colors.text },
  dotActive: { backgroundColor: t.colors.inverseText },
}))
