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
   * Si no se puede escribir (silenciado, sin permiso, fuera del servidor), el motivo: el input queda
   * deshabilitado y se muestra arriba. null o sin definir: se puede escribir.
   */
  blockedMessage?: string | null
}

/** Barra de escritura de una línea, entre líneas finas, con "ENVIAR /" a la derecha. */
export default function Composer({ channelName, value, onChangeText, onSend, blockedMessage = null }: ComposerProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const blocked = blockedMessage !== null
  const canSend = !blocked && !!value.trim()
  return (
    <View>
      {/* Se vuelve a habilitar solo cuando el chat avisa que puede escribir (vence o se levanta el mute) */}
      {blocked && (
        <Text variant="meta" bold style={styles.blocked} accessibilityLiveRegion="polite">
          / {blockedMessage}
        </Text>
      )}
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
          editable={!blocked}
          accessibilityLabel={`Mensaje para ${channelName}`}
          accessibilityState={{ disabled: blocked }}
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
  blocked: {
    paddingVertical: t.space[2],
    paddingHorizontal: t.space[4],
    borderTopWidth: t.lines.hairline,
    borderTopColor: t.colors.line,
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
