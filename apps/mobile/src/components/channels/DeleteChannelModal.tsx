import React, { useState } from 'react'
import { useData, useUI } from '../../providers/AppProviders'
import { Modal, ModalActions, ModalForm, Text } from '../../ui'
import type { Channel } from '../../types'

interface DeleteChannelModalProps {
  visible: boolean
  serverId: string
  channel: Channel | null
  onClose: () => void
  onSuccess?: () => void
}

/** "¿Eliminar canal?": texto chico, _cancelar y el bloque rojo; si falla, el error queda en el modal. */
export default function DeleteChannelModal({ visible, serverId, channel, onClose, onSuccess }: DeleteChannelModalProps) {
  const { deleteChannel } = useData()
  const { showToast } = useUI()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirmDelete = async () => {
    if (!channel) return
    setLoading(true)
    setError(null)
    try {
      await deleteChannel(serverId, channel.id)
      showToast(`Canal •${channel.name} eliminado`, 'success')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      const msg = err?.message || 'Error al eliminar el canal.'
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('permiso')) {
        setError('No tienes permisos de administración para eliminar este canal.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setError(null)
    onClose()
  }

  return (
    <Modal visible={visible && !!channel} title="¿Eliminar canal?" onClose={handleClose} role="alertdialog">
      {channel && (
        <ModalForm>
          <Text variant="bodySmall">Se borra •{channel.name} con todos sus mensajes. No se puede deshacer.</Text>
          {error && (
            <Text variant="bodySmall" bold accessibilityRole="alert">
              / {error}
            </Text>
          )}
          <ModalActions submitLabel="Eliminar" tone="danger" onSubmit={handleConfirmDelete} onCancel={handleClose} loading={loading} />
        </ModalForm>
      )}
    </Modal>
  )
}
