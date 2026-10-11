import React, { useState } from 'react'
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
import { X } from 'lucide-react-native'
import { errorMessageFor } from '@shared/api/errors'
import { useData, useUI } from '../../providers/AppProviders'
import { colors, radii, spacing, typography } from '../../theme'

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

  const handleNameChange = (text: string) => {
    setName(text)
    if (error) setError(null)
  }

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
      showToast?.(`Categoría "${trimmed}" creada.`, 'success')
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Crear categoría</Text>
            <Pressable onPress={handleClose} disabled={loading} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>NOMBRE DE LA CATEGORÍA</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={handleNameChange}
              placeholder="NUEVA CATEGORÍA"
              placeholderTextColor={colors.textDim}
              maxLength={100}
              autoFocus
              editable={!loading}
            />
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={handleClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={[styles.submitButton, (!name.trim() || loading) && styles.submitButtonDisabled]}
              onPress={handleCreate}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Crear categoría</Text>
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
