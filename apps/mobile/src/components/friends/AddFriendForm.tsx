import React, { useState } from 'react'
import { ScrollView } from 'react-native'
import { errorMessageFor, FRIEND_REQUEST_MESSAGE_MAX, useSendFriendRequestMutation } from '@discordia/core'
import { makeStyles } from '../../theme'
import { BlockButton, Text, UnderlineInput } from '../../ui'

/**
 * AÑADIR: pide amistad por usuario o email, con una descripción opcional. Por email siempre dice lo mismo: nunca
 * confirma si la cuenta existe.
 */
export function AddFriendForm() {
  const styles = useStyles()
  const send = useSendFriendRequestMutation()
  const [target, setTarget] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const trimmed = target.trim()
    if (!trimmed) {
      setError('Escribí un usuario o un email.')
      return
    }
    setError(null)
    setNotice(null)
    send.mutate(
      { target: trimmed, message: message.trim() || undefined },
      {
        onSuccess: request => {
          setTarget('')
          setMessage('')
          setNotice(request?.user.relationship === 'friend' ? 'Ahora son amigos.' : 'Solicitud enviada.')
        },
        onError: err =>
          setError(
            errorMessageFor(
              err,
              {
                404: 'No encontramos ese usuario.',
                409: 'Ya son amigos o ya hay una solicitud pendiente.',
                422: 'No podés mandarte una solicitud a vos.',
              },
              'No se pudo enviar la solicitud.',
            ),
          ),
      },
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <UnderlineInput
        label="usuario o email"
        required
        value={target}
        onChangeText={text => {
          setTarget(text)
          setError(null)
          setNotice(null)
        }}
        autoCapitalize="none"
        autoCorrect={false}
        error={error ?? undefined}
        disabled={send.isPending}
      />
      <UnderlineInput
        label="descripción"
        value={message}
        onChangeText={setMessage}
        placeholder="contale de dónde se conocen"
        maxLength={FRIEND_REQUEST_MESSAGE_MAX}
        multiline
        hint={`${message.length}/${FRIEND_REQUEST_MESSAGE_MAX}`}
        disabled={send.isPending}
      />
      {notice && (
        <Text variant="meta" bold accessibilityLiveRegion="polite">
          / {notice}
        </Text>
      )}
      <BlockButton loading={send.isPending} onPress={submit}>
        Enviar solicitud
      </BlockButton>
    </ScrollView>
  )
}

const useStyles = makeStyles(t => ({
  form: { gap: t.space[5], paddingVertical: t.space[5], paddingHorizontal: t.space[4] },
}))
