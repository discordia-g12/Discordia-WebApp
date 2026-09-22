import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Hash, Trash2, Volume2, X } from 'lucide-react-native'
import { useData, useUI } from '../providers/AppProviders'
import { colors, radii, spacing, typography } from '../theme'
import type { Channel } from '../types'

interface EditChannelModalProps {
  visible: boolean
  serverId: string
  channel: Channel | null
  onClose: () => void
  onSuccess?: (channel: Channel) => void
  onRequestDelete?: (channel: Channel) => void
}

export default function EditChannelModal({
  visible,
  serverId,
  channel,
  onClose,
  onSuccess,
  onRequestDelete,
}: EditChannelModalProps) {
  const { editChannel } = useData()
  const { showToast } = useUI()
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible && channel) {
      setName(channel.name)
      setTopic(channel.topic ?? '')
      setError(null)
    }
  }, [visible, channel])

  const handleNameChange = (text: string) => {
    if (channel?.type === 'text') {
      setName(text.toLowerCase().replace(/\s+/g, '-'))
    } else {
      setName(text)
    }
  }

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
      const updated = await editChannel(serverId, channel.id, {
        name: trimmedName,
        topic: topic.trim(),
      })
      showToast?.(`Canal #${updated.name} actualizado con éxito.`, 'success')
      onSuccess?.(updated)
      onClose()
    } catch (err: any) {
      const msg = err?.message || 'Error al actualizar el canal.'
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('permiso')) {
        setError('No tienes permisos de administración para editar este canal.')
      } else if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('ya existe')) {
        setError('Ya existe un canal con ese nombre en esta categoría.')
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

  if (!channel) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              {channel.type === 'voice' ? (
                <Volume2 color={colors.textMuted} size={20} />
              ) : (
                <Hash color={colors.textMuted} size={20} />
              )}
              <Text style={styles.title}>Editar canal</Text>
            </View>
            <Pressable onPress={handleClose} disabled={loading} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Campo Nombre */}
          <Text style={styles.label}>NOMBRE DEL CANAL</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={handleNameChange}
              placeholder="nombre-del-canal"
              placeholderTextColor={colors.textDim}
              maxLength={100}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Campo Tema / Topic */}
          <Text style={styles.label}>TEMA DEL CANAL (OPCIONAL)</Text>
          <View style={[styles.inputWrap, styles.topicInputWrap]}>
            <TextInput
              style={[styles.input, styles.topicInput]}
              value={topic}
              onChangeText={setTopic}
              placeholder="¿De qué se habla en este canal?"
              placeholderTextColor={colors.textDim}
              maxLength={1024}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          {/* Botón rápido de eliminar canal */}
          {onRequestDelete && (
            <Pressable
              style={styles.deleteLinkRow}
              onPress={() => {
                onClose()
                onRequestDelete(channel)
              }}
              disabled={loading}
            >
              <Trash2 color={colors.danger} size={16} />
              <Text style={styles.deleteLinkText}>Eliminar este canal</Text>
            </Pressable>
          )}

          <View style={styles.actions}>
            <Pressable
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={[
                styles.submitButton,
                (!name.trim() || loading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Guardar cambios</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.pageTitle,
    color: colors.text,
    fontSize: 20,
  },
  closeButton: {
    padding: spacing.xs,
  },
  errorBox: {
    backgroundColor: 'rgba(237, 66, 69, 0.15)',
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    ...typography.metadata,
    color: colors.danger,
  },
  label: {
    ...typography.metadata,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  inputWrap: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  input: {
    ...typography.messageText,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topicInputWrap: {
    minHeight: 70,
  },
  topicInput: {
    textAlignVertical: 'top',
  },
  deleteLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  deleteLinkText: {
    ...typography.helperText,
    color: colors.danger,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  cancelText: {
    ...typography.button,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    ...typography.button,
    color: colors.accentFg,
  },
})

