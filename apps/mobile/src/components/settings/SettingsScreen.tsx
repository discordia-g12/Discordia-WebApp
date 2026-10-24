import React, { useEffect, useRef, useState } from 'react'
import { Animated, Modal as RNModal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { makeStyles, useTheme } from '../../theme'
import { Background, DisplayText, Text, duration, easing, useNativeDriver, useReducedMotion, useRise } from '../../ui'

export interface SettingsSection<T extends string> {
  id: T
  /** Palabra del menú ("ROLES"). */
  label: string
}

interface SettingsScreenProps<T extends string> {
  visible: boolean
  /** Nombre accesible de la pantalla ("Ajustes de Torton"). */
  title: string
  /** Arriba a la izquierda: quién o qué se está ajustando. */
  identity: React.ReactNode
  sections: SettingsSection<T>[]
  active: T
  onSelect: (section: T) => void
  /** Palabras del menú que no son secciones: abren un modal (INVITAR, ELIMINAR). */
  actions?: { label: string; onPress: () => void }[]
  onClose: () => void
  /** Fijo al pie, sobre las celdas (la barra de cambios sin guardar). */
  footer?: React.ReactNode
  children: React.ReactNode
}

/**
 * Marco de los ajustes (PDF, pág. 11), en la versión de pantalla chica de la web: la identidad y la × arriba,
 * el menú de palabras gigantes como una fila que se desliza (la activa en tinta) y las celdas debajo, una
 * por fila. Baja como una cortina encima de la app (que sigue montada: no se pierde el chat ni la llamada)
 * y sale subiendo. Las celdas de la sección entran escalonadas al cambiar de sección.
 */
export function SettingsScreen<T extends string>({ visible, title, identity, sections, active, onSelect, actions = [], onClose, footer, children }: SettingsScreenProps<T>) {
  const styles = useStyles()
  const { colors } = useTheme()
  const reduce = useReducedMotion()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const [mounted, setMounted] = useState(visible)
  const [progress] = useState(() => new Animated.Value(0))
  // La fila del menú se desliza hasta la sección elegida (si quedó afuera, a la derecha)
  const menuRef = useRef<ScrollView>(null)
  const positions = useRef<Partial<Record<T, number>>>({})
  useEffect(() => {
    const x = positions.current[active]
    if (x !== undefined) menuRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: !reduce })
  }, [active, reduce])

  useEffect(() => {
    if (visible) setMounted(true)
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: duration('curtain', reduce),
      easing: easing(visible ? 'enter' : 'exit'),
      useNativeDriver,
    })
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false)
    })
    return () => animation.stop()
  }, [visible, reduce, progress])

  if (!mounted) return null

  return (
    <RNModal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View
        style={[
          styles.screen,
          {
            opacity: reduce ? progress : 1,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduce ? 0 : -height, 0] }) }],
          },
        ]}
        accessibilityViewIsModal
        accessibilityLabel={title}
      >
        <Background />
        <View style={[styles.side, { paddingTop: insets.top }]}>
          <View style={styles.head}>
            <View style={styles.identity}>{identity}</View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar los ajustes">
              <X color={colors.text} size={22} strokeWidth={1.5} />
            </Pressable>
          </View>
          <ScrollView ref={menuRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menu} accessibilityRole="tablist">
            {sections.map(section => (
              <View
                key={section.id}
                onLayout={e => {
                  positions.current[section.id] = e.nativeEvent.layout.x
                }}
              >
                <DisplayText active={section.id === active} onPress={() => onSelect(section.id)}>
                  {section.label}
                </DisplayText>
              </View>
            ))}
            {actions.map(action => (
              <DisplayText key={action.label} onPress={action.onPress}>
                {action.label}
              </DisplayText>
            ))}
          </ScrollView>
        </View>
        <ScrollView
          key={active}
          contentContainerStyle={[styles.cells, { paddingBottom: insets.bottom + 48 }]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingBottom: insets.bottom }}>{footer}</View> : null}
      </Animated.View>
    </RNModal>
  )
}

/** Celda de la grilla: título con barra final ("INFORMACIÓN /") y su contenido, que entra subiendo. */
export function SettingsCell({ title, soon = false, index = 0, children }: { title: string; soon?: boolean; index?: number; children: React.ReactNode }) {
  const styles = useStyles()
  const enter = useRise({ delay: index * 60, name: 'base' })
  return (
    <Animated.View style={[styles.cell, enter]} accessibilityLabel={title}>
      <View style={styles.cellTitle}>
        <Text variant="label" accessibilityRole="header">
          {title} /
        </Text>
        {soon && (
          <Text variant="meta" tone="muted">
            próximamente
          </Text>
        )}
      </View>
      {soon ? (
        <View style={styles.soon} pointerEvents="none" accessibilityState={{ disabled: true }}>
          <Text variant="meta" tone="muted">
            / Todavía no se guarda en el servidor.
          </Text>
          {children}
        </View>
      ) : (
        <View style={styles.cellBody}>{children}</View>
      )}
    </Animated.View>
  )
}

/** Fila con título en negrita, descripción chica y un control a la derecha (switches, acciones). */
export function SettingsRow({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  const styles = useStyles()
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text variant="bodySmall" bold>
          {title}
        </Text>
        {description && (
          <Text variant="meta" tone="muted">
            {description}
          </Text>
        )}
      </View>
      {children}
    </View>
  )
}

/** Interruptor cuadrado: el bloque se corre a la derecha y se invierte al activarse. */
export function Switch({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const [shift] = useState(() => new Animated.Value(checked ? 1 : 0))
  useEffect(() => {
    Animated.timing(shift, { toValue: checked ? 1 : 0, duration: duration('fast', reduce), easing: easing('standard'), useNativeDriver }).start()
  }, [checked, reduce, shift])
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      style={[styles.switch, checked && styles.switchOn, disabled && styles.disabled]}
    >
      <Animated.View
        style={[
          styles.knob,
          checked && styles.knobOn,
          { transform: [{ translateX: shift.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) }] },
        ]}
      />
    </Pressable>
  )
}

/** Aviso chico con barra ("/ Se revocó el baneo"); los errores, en negrita. */
export function Feedback({ children, tone = 'default' }: { children: string; tone?: 'default' | 'error' }) {
  return (
    <Text variant="bodySmall" bold={tone === 'error'} accessibilityRole={tone === 'error' ? 'alert' : 'text'} accessibilityLiveRegion="polite">
      / {children}
    </Text>
  )
}

const useStyles = makeStyles(t => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  side: { borderBottomWidth: t.lines.hairline, borderBottomColor: t.colors.lineStrong },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space[3], paddingTop: t.space[4], paddingHorizontal: t.space[4] },
  identity: { flex: 1 },
  menu: { gap: t.space[5], paddingVertical: t.space[3], paddingHorizontal: t.space[4] },
  cells: {},
  cell: { gap: t.space[3], padding: t.space[5], borderBottomWidth: t.lines.hairline, borderBottomColor: t.colors.lineStrong },
  cellTitle: { flexDirection: 'row', alignItems: 'baseline', gap: t.space[2] },
  cellBody: { gap: t.space[4] },
  soon: { gap: t.space[4], opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[4] },
  rowText: { flex: 1, gap: 2 },
  switch: { width: 36, height: 20, padding: 2, borderWidth: t.lines.hairline, borderColor: t.colors.lineStrong },
  switchOn: { backgroundColor: t.colors.inverseBackground, borderColor: t.colors.inverseBackground },
  knob: { width: 14, height: 14, backgroundColor: t.colors.lineStrong },
  knobOn: { backgroundColor: t.colors.inverseText },
  disabled: { opacity: 0.5 },
}))
