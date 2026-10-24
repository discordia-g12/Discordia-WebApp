import React, { useState } from 'react'
import { errorMessageFor } from '@discordia/core'
import { useData, useUI } from '../../providers/AppProviders'
import { Modal, ModalActions, ModalForm, UnderlineInput } from '../../ui'

interface CreateCategoryModalProps {
  visible: boolean
  serverId: string
  onClose: () => void
}

// CA 1: crear una categoría para agrupar canales
export default function CreateCategoryModal({ visible, serverId, onClose }: CreateCategoryModalProps) {
  const { createCategory } = useData()
  const { showToast } = useUI()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('El nombre de la categoría no puede estar vacío.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createCategory(serverId, trimmed)
      setName('')
      onClose()
      showToast(`Categoría ${trimmed} creada`, 'success')
    } catch (err) {
      setError(
        errorMessageFor(
          err,
          {
            400: 'Ya existe una categoría con ese nombre.',
            403: 'No tenés permisos para crear categorías en este servidor.',
            422: 'El nombre de la categoría no es válido.',
          },
          'No se pudo crear la categoría. Intentá de nuevo.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setError(null)
    setName('')
    onClose()
  }

  return (
    <Modal visible={visible} title="Crear categoría" description="Agrupa canales bajo un título." onClose={handleClose}>
      <ModalForm>
        <UnderlineInput
          label="nombre de la categoría"
          required
          value={name}
          onChangeText={text => {
            setName(text)
            if (error) setError(null)
          }}
          placeholder="ej: canales de voz"
          maxLength={100}
          autoFocus
          error={error ?? undefined}
          disabled={loading}
          returnKeyType="go"
          onSubmitEditing={handleCreate}
        />
        <ModalActions submitLabel="Crear" onSubmit={handleCreate} onCancel={handleClose} loading={loading} disabled={!name.trim()} />
      </ModalForm>
    </Modal>
  )
}
