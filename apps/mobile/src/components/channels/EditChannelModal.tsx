import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { errorMessageFor, isLocalCategoryId } from '@discordia/core'
import { useData, useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { ActionLink, Choice, Modal, ModalActions, ModalForm, Text, UnderlineInput } from '../../ui'
import type { Category, Channel } from '../../types'

interface EditChannelModalProps {
  visible: boolean
  serverId: string
  channel: Channel | null
  categories?: Category[]
  onClose: () => void
  onSuccess?: (channel: Channel) => void
  onDeleted?: () => void
  onRequestDelete?: (channel: Channel) => void
}

const NO_CATEGORY = '__none__'

/** Editar un canal: nombre, tema y categoría; "_eliminar canal" abre la confirmación. */
export default function EditChannelModal({ visible, serverId, channel, categories, onClose, onSuccess, onDeleted, onRequestDelete }: EditChannelModalProps) {
  const styles = useStyles()
  const { editChannel, deleteChannel } = useData()
  const { showToast } = useUI()
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Solo categorías reales: la sección general es local y equivale a "sin categoría"
  const selectableCategories = (categories ?? []).filter(c => !isLocalCategoryId(c.id))

  useEffect(() => {
    if (visible && channel) {
      setName(channel.name)
      setTopic(channel.topic ?? '')
      setCategoryId(channel.categoryId ?? null)
      setError(null)
      setConfirmingDelete(false)
    }
  }, [visible, channel])

  const handleSave = async () => {
    if (!channel) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('El nombre del canal no puede estar vacío.')
      return
    }
    if (trimmedName.length > 100) {
      setError('El nombre no puede superar los 100 caracteres.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const categoryChanged = categoryId !== (channel.categoryId ?? null)
      const updated = await editChannel(serverId, channel.id, {
        name: trimmedName,
        topic: topic.trim(),
        ...(categoryChanged && { categoryId }),
      })
      showToast(`Canal •${updated.name} actualizado`, 'success')
      onSuccess?.(updated)
      onClose()
    } catch (err) {
      setError(
        errorMessageFor(
          err,
          {
            400: 'Ya existe un canal con ese nombre en la categoría elegida.',
            403: 'No tenés permisos para editar o mover canales en este servidor.',
            404: 'La categoría elegida ya no existe.',
          },
          'Error al actualizar el canal.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!channel) return
    setLoading(true)
    setError(null)
    try {
      await deleteChannel(serverId, channel.id)
      showToast(`Canal •${channel.name} eliminado`, 'success')
      onDeleted?.()
      onClose()
    } catch (err) {
      const msg = (err instanceof Error && err.message) || 'Error al eliminar el canal.'
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('permiso')) {
        setError('No tenés permisos para eliminar canales en este servidor.')
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
    setConfirmingDelete(false)
    onClose()
  }

  if (confirmingDelete) {
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
            <ModalActions
              submitLabel="Eliminar"
              tone="danger"
              onSubmit={handleConfirmDelete}
              onCancel={() => {
                if (loading) return
                setError(null)
                setConfirmingDelete(false)
              }}
              loading={loading}
            />
          </ModalForm>
        )}
      </Modal>
    )
  }

  return (
    <Modal visible={visible && !!channel} title="Editar canal" description={channel ? `•${channel.name}` : undefined} onClose={handleClose}>
      {channel && (
        <ModalForm>
          <UnderlineInput
            label="nombre del canal"
            required
            value={name}
            onChangeText={text => {
              setName(channel.type === 'text' ? text.toLowerCase().replace(/\s+/g, '-') : text)
              if (error) setError(null)
            }}
            maxLength={100}
            autoCapitalize="none"
            error={error ?? undefined}
            disabled={loading}
          />
          <UnderlineInput
            label="tema"
            value={topic}
            onChangeText={setTopic}
            placeholder="de qué se habla acá"
            maxLength={1024}
            disabled={loading}
          />
          <View style={styles.field}>
            <Text variant="label">Categoría /</Text>
            <Choice
              label="Categoría"
              options={[{ value: NO_CATEGORY, label: 'sin categoría' }, ...selectableCategories.map(c => ({ value: c.id, label: c.name }))]}
              value={categoryId ?? NO_CATEGORY}
              onChange={value => setCategoryId(value === NO_CATEGORY ? null : value)}
            />
          </View>
          <ModalActions submitLabel="Guardar" onSubmit={handleSave} onCancel={handleClose} loading={loading} />
          <View style={styles.danger}>
            <ActionLink
              onPress={() => {
                if (onRequestDelete && !onDeleted) {
                  onRequestDelete(channel)
                } else {
                  setError(null)
                  setConfirmingDelete(true)
                }
              }}
              disabled={loading}
            >
              eliminar canal
            </ActionLink>
          </View>
        </ModalForm>
      )}
    </Modal>
  )
}

const useStyles = makeStyles(t => ({
  field: { gap: t.space[2] },
  danger: { paddingTop: t.space[3], borderTopWidth: t.lines.hairline, borderTopColor: t.colors.line },
}))
