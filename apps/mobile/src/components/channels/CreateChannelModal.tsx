import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { errorMessageFor, isLocalCategoryId } from '@discordia/core'
import { useData, useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { Choice, Modal, ModalActions, ModalForm, Text, UnderlineInput } from '../../ui'
import type { Category, Channel } from '../../types'

interface CreateChannelModalProps {
  visible: boolean
  serverId: string
  categories?: Category[]
  categoryId?: string | null
  onClose: () => void
  onSuccess?: (channel: Channel) => void
}

/** Sin categoría: el valor de la opción (Choice necesita un string). */
const NO_CATEGORY = '__none__'

/** Crear un canal: tipo y categoría con Choice, como en la web. */
export default function CreateChannelModal({ visible, serverId, categories, categoryId, onClose, onSuccess }: CreateChannelModalProps) {
  const styles = useStyles()
  const { createChannel } = useData()
  const { selectChannel, showToast } = useUI()
  const [type, setType] = useState<'text' | 'voice'>('text')
  const [name, setName] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryId ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) setSelectedCategoryId(categoryId ?? null)
  }, [visible, categoryId])

  // Los de texto en minúsculas y con guiones en vez de espacios
  const formatName = (text: string, channelType = type) =>
    channelType === 'text' ? text.toLowerCase().replace(/\s+/g, '-') : text

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('El nombre del canal no puede estar vacío.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const channel = await createChannel(serverId, { name: trimmed, type, categoryId: selectedCategoryId || undefined })
      setName('')
      setType('text')
      setSelectedCategoryId(null)
      onClose()
      selectChannel(channel.id)
      showToast(`Canal •${channel.name} creado`, 'success')
      onSuccess?.(channel)
    } catch (err) {
      setError(
        errorMessageFor(
          err,
          {
            400: 'Ya existe un canal con ese nombre en esta categoría.',
            403: 'No tenés permisos para crear canales en este servidor.',
            404: 'La categoría elegida ya no existe.',
          },
          'Error al crear el canal. Intentá de nuevo.',
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
    setType('text')
    setSelectedCategoryId(null)
    onClose()
  }

  const categoryOptions = [
    { value: NO_CATEGORY, label: 'sin categoría' },
    ...(categories ?? []).filter(c => !isLocalCategoryId(c.id)).map(c => ({ value: c.id, label: c.name })),
  ]

  return (
    <Modal visible={visible} title="Crear canal" onClose={handleClose}>
      <ModalForm>
        <View style={styles.field}>
          <Text variant="label">Tipo /</Text>
          <Choice
            label="Tipo de canal"
            options={[
              { value: 'text', label: 'texto' },
              { value: 'voice', label: 'voz' },
            ]}
            value={type}
            onChange={next => {
              setType(next)
              setName(prev => formatName(prev, next))
            }}
          />
        </View>
        <UnderlineInput
          label="nombre del canal"
          required
          value={name}
          onChangeText={text => {
            setName(formatName(text))
            if (error) setError(null)
          }}
          placeholder={type === 'text' ? 'ej: general' : 'ej: meet core'}
          maxLength={100}
          autoCapitalize="none"
          error={error ?? undefined}
          disabled={loading}
          returnKeyType="go"
          onSubmitEditing={handleCreate}
        />
        <View style={styles.field}>
          <Text variant="label">Categoría /</Text>
          <Choice
            label="Categoría"
            options={categoryOptions}
            value={selectedCategoryId ?? NO_CATEGORY}
            onChange={value => setSelectedCategoryId(value === NO_CATEGORY ? null : value)}
          />
        </View>
        <ModalActions submitLabel="Crear" onSubmit={handleCreate} onCancel={handleClose} loading={loading} disabled={!name.trim()} />
      </ModalForm>
    </Modal>
  )
}

const useStyles = makeStyles(t => ({
  field: { gap: t.space[2] },
}))
