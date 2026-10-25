import React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { makeStyles, useTheme } from '../../theme'
import { DisplayText, Text } from '../../ui'

/**
 * Pantalla de una pestaña: el encabezado gigante (el contexto, como la marca de agua del escritorio,
 * pero en tinta: acá es el título) y su contenido. tinted: celeste, como la barra lateral de un servidor.
 * scroll: false cuando el contenido ya scrollea solo (una lista).
 */
export function Screen({
  title,
  tinted = false,
  scroll = true,
  children,
}: {
  title: string
  tinted?: boolean
  scroll?: boolean
  children: React.ReactNode
}) {
  const styles = useStyles()
  const heading = (
    <View style={styles.heading} accessible accessibilityRole="header" accessibilityLabel={title}>
      <DisplayText variant="watermark">{title}</DisplayText>
    </View>
  )
  return (
    <View style={[styles.screen, tinted && styles.sky]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          {heading}
          {children}
        </ScrollView>
      ) : (
        <>
          {heading}
          <View style={styles.body}>{children}</View>
        </>
      )}
    </View>
  )
}

/** Algo abierto a pantalla completa (chat, voz, miembros), con la vuelta arriba ("‹ Torton"). */
export function Pane({ backLabel, onBack, children }: { backLabel: string; onBack: () => void; children: React.ReactNode }) {
  const styles = useStyles()
  const { colors } = useTheme()
  return (
    <View style={styles.screen}>
      <Pressable
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={`Volver a ${backLabel}`}
      >
        <ChevronLeft color={colors.text} size={16} strokeWidth={1.5} />
        <Text variant="bodySmall" bold numberOfLines={1} style={styles.backText}>
          {backLabel}
        </Text>
      </Pressable>
      <View style={styles.body}>{children}</View>
    </View>
  )
}

/** Contenido con aire a los costados (estados vacíos, perfil). */
export function Padded({ children }: { children: React.ReactNode }) {
  const styles = useStyles()
  return <View style={styles.padded}>{children}</View>
}

const useStyles = makeStyles(t => ({
  screen: { flex: 1 },
  sky: { backgroundColor: t.colors.skyTint },
  scrollBody: { flexGrow: 1 },
  body: { flex: 1 },
  heading: {
    paddingTop: t.space[5],
    paddingBottom: t.space[3],
    paddingHorizontal: t.space[4],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.lineStrong,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    height: 40,
    paddingHorizontal: t.space[3],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.lineStrong,
  },
  backText: { flex: 1 },
  pressed: { backgroundColor: t.colors.line },
  padded: { gap: t.space[4], paddingVertical: t.space[5], paddingHorizontal: t.space[4] },
}))
