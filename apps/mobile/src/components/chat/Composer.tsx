import React from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { makeStyles, useTheme } from '../../theme'
import { Text, noWebOutline } from '../../ui'

interface ComposerProps {
  channelName: string
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  /**
   * Si no se puede escribir (silenciado, sin permiso, fuera del servidor), el motivo: se muestra en lugar
   * de la barra. null o sin definir: se puede escribir.
   */
  blockedMessage?: string | null
}

/** Barra de escritura de una línea, entre líneas finas, con "ENVIAR /" a la derecha. */
export default function Composer({ channelName, value, onChangeText, onSend, blockedMessage = null }: ComposerProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const canSend = !!value.trim()

  // En lugar de la barra, solo el aviso. Vuelve cuando el chat avisa que puede escribir (vence o se levanta el mute)
  if (blockedMessage !== null) {
    return (
      <View style={styles.composer}>
        <Text variant="meta" bold style={styles.blocked} accessibilityLiveRegion="polite">
          {blockedMessage}
        </Text>
      </View>
    )
  }

  return (
    <View>
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
    </View>
  )
}

const useStyles = makeStyles(t => ({
  // Va adentro de la barra (que ya tiene la línea de arriba), en lugar del input
  blocked: {
    flex: 1,
    paddingVertical: t.space[3],
    paddingHorizontal: t.space[4],
  },
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
  send: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: t.space[4],
    borderLeftWidth: t.lines.hairline,
    borderLeftColor: t.colors.line,
  },
}))
