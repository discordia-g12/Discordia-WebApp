import React from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { makeStyles, useTheme } from '../../theme'
import { Text, noWebOutline } from '../../ui'

interface ComposerProps {
  channelName: string
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  /** Sin permiso para escribir (o silenciado): en lugar de la barra se muestra el aviso. */
  disabled?: boolean
}

/** Barra de escritura de una línea, entre líneas finas, con "ENVIAR /" a la derecha. */
export default function Composer({ channelName, value, onChangeText, onSend, disabled = false }: ComposerProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const canSend = !!value.trim()

  // Sin permiso para escribir (o silenciado): en lugar de la barra, solo el aviso
  if (disabled) {
    return (
      <View style={styles.composer} accessibilityRole="text" accessibilityLiveRegion="polite">
        <Text variant="bodySmall" tone="muted" style={styles.locked}>
          No podés enviar mensajes en este canal
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.composer}>
      <TextInput
        style={styles.input}
        placeholder={`Enviar mensaje a •${channelName}`}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.text}
        value={value}
        onChangeText={onChangeText}
        maxLength={2500}
        multiline
        accessibilityLabel={`Mensaje para ${channelName}`}
      />
      <Pressable
        style={styles.send}
        onPress={onSend}
        disabled={!canSend}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Enviar"
        accessibilityState={{ disabled: !canSend }}
      >
        <Text variant="bodySmall" bold tone={canSend ? 'default' : 'muted'}>
          ENVIAR /
        </Text>
      </Pressable>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: t.space[7],
    borderTopWidth: t.lines.hairline,
    borderTopColor: t.colors.lineStrong,
  },
  input: {
    ...t.text.bodySmall,
    flex: 1,
    color: t.colors.text,
    maxHeight: 100,
    paddingVertical: t.space[3],
    paddingHorizontal: t.space[4],
    ...noWebOutline,
  },
  locked: { flex: 1, paddingVertical: t.space[3], paddingHorizontal: t.space[4] },
  send: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: t.space[4],
    borderLeftWidth: t.lines.hairline,
    borderLeftColor: t.colors.line,
  },
}))
