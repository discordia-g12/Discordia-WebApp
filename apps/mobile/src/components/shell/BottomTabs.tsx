import React from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, Hash, MessageSquare, User as UserIcon, type LucideIcon } from 'lucide-react-native'
import { makeStyles, useTheme } from '../../theme'
import { Text } from '../../ui'

export type ShellTab = 'servers' | 'messages' | 'notifications' | 'profile'

// "Notificaciones" no entra en cuatro columnas de un teléfono: "Avisos", como en la mobile web
const TABS: { id: ShellTab; label: string; icon: LucideIcon }[] = [
  { id: 'servers', label: 'Servidores', icon: Hash },
  { id: 'messages', label: 'Mensajes', icon: MessageSquare },
  { id: 'notifications', label: 'Avisos', icon: Bell },
  { id: 'profile', label: 'Perfil', icon: UserIcon },
]

/** Barra inferior: cuatro secciones separadas por líneas; la activa, en bloque invertido. */
export function BottomTabs({ value, onChange }: { value: ShellTab; onChange: (tab: ShellTab) => void }) {
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
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
          >
            <Icon color={active ? colors.inverseText : colors.textMuted} size={18} strokeWidth={1.5} />
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
}))
