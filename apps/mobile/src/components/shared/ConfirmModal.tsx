import React, { useState } from 'react'
import { Modal, ModalActions, ModalForm, Text, UnderlineInput } from '../../ui'

interface ConfirmModalProps {
  visible: boolean
  /** "¿Abandonar servidor?" */
  title: string
  message: string
  confirmLabel: string
  /** danger: acciones destructivas (el bloque en rojo). */
  tone?: 'default' | 'danger'
  /** Hay que escribir este texto para confirmar (eliminar un servidor pide su nombre). */
  requireText?: string
  onCancel: () => void
  /** Si devuelve una promesa, el botón queda cargando hasta que termine. */
  onConfirm: () => void | Promise<void>
}

/**
 * Confirmación de una acción crítica (docs/TODO-REDISENO.md, sección 3): título en display, texto chico,
 * _cancelar y el bloque de la acción (rojo solo si es destructiva). Eliminar un servidor pide escribir su nombre.
 */
export default function ConfirmModal({ visible, title, message, confirmLabel, tone = 'default', requireText, onCancel, onConfirm }: ConfirmModalProps) {
  const [busy, setBusy] = useState(false)
  const [typed, setTyped] = useState('')
  const matches = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase()

  const confirm = async () => {
    if (!matches) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setTyped('')
    }
  }

  return (
    <Modal visible={visible} title={title} onClose={busy ? () => {} : onCancel} role="alertdialog">
      <ModalForm>
        <Text variant="bodySmall">{message}</Text>
        {requireText && (
          <UnderlineInput
            label={`escribí ${requireText} para confirmar`}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="none"
            disabled={busy}
          />
        )}
        <ModalActions
          submitLabel={confirmLabel}
          tone={tone}
          loading={busy}
          disabled={!matches}
          onSubmit={confirm}
          onCancel={() => {
            setTyped('')
            onCancel()
          }}
        />
      </ModalForm>
    </Modal>
  )
}
