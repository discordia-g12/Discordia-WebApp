import React, { useState } from 'react'
import { Modal, ModalActions, ModalForm, Text } from '../../ui'

interface ConfirmModalProps {
  visible: boolean
  /** "¿Abandonar servidor?" */
  title: string
  message: string
  confirmLabel: string
  /** danger: acciones destructivas (el bloque en rojo). */
  tone?: 'default' | 'danger'
  onCancel: () => void
  /** Si devuelve una promesa, el botón queda cargando hasta que termine. */
  onConfirm: () => void | Promise<void>
}

/**
 * Confirmación de una acción crítica (docs/TODO-REDISENO.md, sección 3): título en display, texto chico,
 * _cancelar y el bloque de la acción (rojo solo si es destructiva).
 */
export default function ConfirmModal({ visible, title, message, confirmLabel, tone = 'default', onCancel, onConfirm }: ConfirmModalProps) {
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible={visible} title={title} onClose={busy ? () => {} : onCancel} role="alertdialog">
      <ModalForm>
        <Text variant="bodySmall">{message}</Text>
        <ModalActions submitLabel={confirmLabel} tone={tone} loading={busy} onSubmit={confirm} onCancel={onCancel} />
      </ModalForm>
    </Modal>
  )
}
