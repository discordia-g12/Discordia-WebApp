import React, { useEffect, useState } from 'react'
import { Animated, KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { makeStyles, useTheme } from '../theme'
import { ActionLink } from './ActionLink'
import { BlockButton } from './BlockButton'
import { DisplayText } from './DisplayText'
import { Text } from './Text'
import { duration, easing, useNativeDriver, useReducedMotion } from './motion'

interface ModalProps {
  visible: boolean
  /** Título en display gigante ("Crear servidor"); también es el nombre del diálogo. */
  title: string
  /** Bajada chica bajo el título, con barra inicial. */
  description?: React.ReactNode
  onClose: () => void
  /** alertdialog: confirmaciones de acciones que no se pueden deshacer. */
  role?: 'dialog' | 'alertdialog'
  children: React.ReactNode
}

/**
 * Modal del rediseño (docs/TODO-REDISENO.md, sección 3), como el de la web: panel a todo el ancho que baja
 * desde arriba como una cortina, con el título en display y el contenido debajo. Se cierra con la ×,
 * tocando afuera o con el botón atrás de Android; sale subiendo.
 */
export function Modal({ visible, title, description, onClose, role = 'dialog', children }: ModalProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const reduce = useReducedMotion()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  // Montado mientras está visible y durante la salida
  const [mounted, setMounted] = useState(visible)
  const [progress] = useState(() => new Animated.Value(0))

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

  const panelMotion = {
    opacity: reduce ? progress : 1,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduce ? 0 : -height * 0.6, 0] }) }],
  }

  return (
    <RNModal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.scrim, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" accessibilityRole="button" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none" style={styles.layer}>
        <Animated.View
          style={[styles.panel, { paddingTop: insets.top, maxHeight: height * 0.9 }, panelMotion]}
          accessibilityViewIsModal
          accessibilityRole={role === 'alertdialog' ? 'alert' : undefined}
          accessibilityLabel={title}
        >
          <View style={styles.head}>
            <View style={styles.title}>
              <DisplayText active>{title}</DisplayText>
              {description ? (
                typeof description === 'string' ? (
                  <Text variant="bodySmall" tone="muted">
                    / {description}
                  </Text>
                ) : (
                  description
                )
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.close}>
              <X color={colors.text} size={22} strokeWidth={1.5} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" bounces={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  )
}

/** Campos del modal, uno debajo del otro con aire. */
export function ModalForm({ children }: { children: React.ReactNode }) {
  const styles = useStyles()
  return <View style={styles.form}>{children}</View>
}

interface ModalActionsProps {
  /** Texto del bloque ("Crear"). */
  submitLabel: string
  onSubmit: () => void
  onCancel?: () => void
  tone?: 'default' | 'danger'
  loading?: boolean
  disabled?: boolean
}

/** Pie del modal: "_cancelar" y el bloque de la acción. */
export function ModalActions({ submitLabel, onSubmit, onCancel, tone = 'default', loading = false, disabled = false }: ModalActionsProps) {
  const styles = useStyles()
  return (
    <View style={styles.actions}>
      {onCancel && (
        <ActionLink size="bodySmall" onPress={onCancel} disabled={loading}>
          cancelar
        </ActionLink>
      )}
      <BlockButton tone={tone} loading={loading} disabled={disabled} onPress={onSubmit}>
        {submitLabel}
      </BlockButton>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  layer: { flex: 1, justifyContent: 'flex-start' },
  // La cortina: fondo del tema y la línea fuerte al pie
  panel: {
    backgroundColor: t.colors.background,
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.lineStrong,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.space[3],
    paddingTop: t.space[5],
    paddingHorizontal: t.space[5],
    paddingBottom: t.space[4],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  title: { flex: 1, gap: t.space[2] },
  close: { paddingTop: t.space[1] },
  body: { padding: t.space[5], paddingBottom: t.space[6] },
  form: { gap: t.space[5] },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: t.space[5], marginTop: t.space[2] },
}))
