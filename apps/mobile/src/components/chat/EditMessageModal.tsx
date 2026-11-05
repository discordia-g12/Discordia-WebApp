import React, { useEffect, useState } from 'react'
import { useData, useUI } from '../../providers/AppProviders'
import { Modal, ModalActions, ModalForm, UnderlineInput } from '../../ui'
import type { Message } from '../../types'

interface EditMessageModalProps {
  visible: boolean
  message: Message | null
  channelId?: string | null
  onClose: () => void
}

/** Modal para editar el contenido de un mensaje propio en mobile. */
export default function EditMessageModal({ visible, message, channelId, onClose }: EditMessageModalProps) {
  const { editMessage } = useData()
  const { showToast } = useUI()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible && message) {
      setContent(message.content)
      setError(null)
    }
  }, [visible, message])

  const handleSave = async () => {
    if (!message || !channelId) return
    const trimmed = content.trim()
    const hasAttachments = Boolean(message.attachments && message.attachments.length > 0)

    if (!trimmed && !hasAttachments) {
      setError('El mensaje no puede estar vacío.')
      return
    }

    if (trimmed.length > 2000) {
      setError('El mensaje no puede superar los 2000 caracteres.')
      return
    }

    if (trimmed === message.content) {
      onClose()
      return
    }

    setLoading(true)
    setError(null)

    try {
      await editMessage(channelId, message.id, trimmed)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo editar el mensaje'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} title="Editar mensaje" onClose={onClose}>
      <ModalForm>
        <UnderlineInput
          label="Contenido"
          value={content}
          onChangeText={text => {
            setContent(text)
            if (error) setError(null)
          }}
          placeholder="Escribí el nuevo mensaje…"
          disabled={loading}
          error={error ?? undefined}
          autoFocus
        />

        <ModalActions
          submitLabel="Guardar"
          onSubmit={handleSave}
          onCancel={onClose}
          loading={loading}
          disabled={loading || (!content.trim() && !(message?.attachments && message.attachments.length > 0))}
        />
      </ModalForm>
    </Modal>
  )
}
