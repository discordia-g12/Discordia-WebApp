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
import { Check, Hash, Volume2, X } from 'lucide-react-native'
import { errorMessageFor, isLocalCategoryId } from '@discordia/core'
import { useData, useUI } from '../../providers/AppProviders'
import { colors, radii, spacing, typography } from '../../theme'
import type { Category, Channel } from '../../types'

interface CreateChannelModalProps {
  visible: boolean
  serverId: string
  categories?: Category[]
  categoryId?: string | null
  onClose: () => void
  onSuccess?: (channel: Channel) => void
}

export default function CreateChannelModal({
  visible,
  serverId,
  categories,
  categoryId,
  onClose,
  onSuccess,
}: CreateChannelModalProps) {
  const { createChannel } = useData()
  const { selectChannel, showToast } = useUI()
  const [type, setType] = useState<'text' | 'voice'>('text')
  const [name, setName] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryId ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setSelectedCategoryId(categoryId ?? null)
    }
  }, [visible, categoryId])

  const handleNameChange = (text: string) => {
    if (type === 'text') {
      // Formato típico de Discord: minúsculas, espacios como guiones
      setName(text.toLowerCase().replace(/\s+/g, '-'))
    } else {
      setName(text)
    }
    if (error) setError(null)
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('El nombre del canal no puede estar vacío.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const channel = await createChannel(serverId, {
        name: trimmed,
        type,
        categoryId: selectedCategoryId || undefined,
      })
      setName('')
      setType('text')
      setSelectedCategoryId(null)
      onClose()
      selectChannel(channel.id)
      showToast?.(`Canal "${channel.name}" creado.`, 'success')
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

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Crear canal</Text>
            <Pressable onPress={handleClose} disabled={loading} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>TIPO DE CANAL</Text>
          <View style={styles.typeSelector}>
            <Pressable
              style={[
                styles.typeOption,
                type === 'text' && styles.typeOptionActive,
              ]}
              onPress={() => {
                setType('text')
                setName(prev => prev.toLowerCase().replace(/\s+/g, '-'))
              }}
              disabled={loading}
            >
              <Hash
                color={type === 'text' ? colors.accentFg : colors.textMuted}
                size={20}
              />
              <View style={styles.typeContent}>
                <Text
                  style={[
                    styles.typeTitle,
                    type === 'text' && styles.typeTitleActive,
                  ]}
                >
                  Texto
                </Text>
                <Text style={styles.typeDesc}>
                  Enviá mensajes, imágenes y memes
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.typeOption,
                type === 'voice' && styles.typeOptionActive,
              ]}
              onPress={() => setType('voice')}
              disabled={loading}
            >
              <Volume2
                color={type === 'voice' ? colors.accentFg : colors.textMuted}
                size={20}
              />
              <View style={styles.typeContent}>
                <Text
                  style={[
                    styles.typeTitle,
                    type === 'voice' && styles.typeTitleActive,
                  ]}
                >
                  Voz
                </Text>
                <Text style={styles.typeDesc}>
                  Reunite por voz, video y pantalla compartida
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Selector de Categoría */}
          <Text style={styles.label}>CATEGORÍA</Text>
          <View style={styles.categorySelector}>
            <Pressable
              style={[
                styles.categoryOption,
                selectedCategoryId === null && styles.categoryOptionActive,
              ]}
              onPress={() => setSelectedCategoryId(null)}
              disabled={loading}
            >
              <Text
                style={[
                  styles.categoryOptionText,
                  selectedCategoryId === null && styles.categoryOptionTextActive,
                ]}
              >
                General
              </Text>
              {selectedCategoryId === null && (
                <Check color={colors.accent} size={16} />
              )}
            </Pressable>

            {categories
              ?.filter(c => !isLocalCategoryId(c.id))
              .map(cat => {
                const active = selectedCategoryId === cat.id
                return (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      active && styles.categoryOptionActive,
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        active && styles.categoryOptionTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {active && <Check color={colors.accent} size={16} />}
                  </Pressable>
                )
              })}
          </View>

          <Text style={styles.label}>NOMBRE DEL CANAL</Text>
          <View style={styles.inputWrap}>
            {type === 'text' ? (
              <Hash color={colors.textMuted} size={16} style={styles.inputIcon} />
            ) : (
              <Volume2 color={colors.textMuted} size={16} style={styles.inputIcon} />
            )}
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={handleNameChange}
              placeholder={type === 'text' ? 'nuevo-canal' : 'Sala de voz'}
              placeholderTextColor={colors.textDim}
              maxLength={100}
              editable={!loading}
            />
          </View>

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
              onPress={handleCreate}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Crear Canal</Text>
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
  typeSelector: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  typeOptionActive: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.accent,
  },
  typeContent: {
    flex: 1,
  },
  typeTitle: {
    ...typography.channelName,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeTitleActive: {
    color: colors.text,
  },
  typeDesc: {
    ...typography.helperText,
    color: colors.textDim,
    marginTop: 2,
  },
  categorySelector: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceHover,
  },
  categoryOptionText: {
    ...typography.channelName,
    fontSize: 14,
    color: colors.textMuted,
  },
  categoryOptionTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cancelText: {
    ...typography.button,
    color: colors.textMuted,
  },
  submitButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    ...typography.button,
    color: colors.accentFg,
    fontWeight: '600',
  },
})
