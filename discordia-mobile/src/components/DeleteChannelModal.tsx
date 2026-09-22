import React, { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Trash2 } from 'lucide-react-native'
import { useData, useUI } from '../providers/AppProviders'
import { colors, radii, spacing, typography } from '../theme'
import type { Channel } from '../types'

interface DeleteChannelModalProps {
  visible: boolean
  serverId: string
  channel: Channel | null
  onClose: () => void
  onSuccess?: () => void
}

export default function DeleteChannelModal({
  visible,
  serverId,
  channel,
  onClose,
  onSuccess,
}: DeleteChannelModalProps) {
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
      showToast?.(`Canal #${channel.name} eliminado con éxito.`, 'success')
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

  if (!channel) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Trash2 color={colors.danger} size={22} />
            </View>
            <Text style={styles.title}>Eliminar canal</Text>
          </View>

          <Text style={styles.description}>
            ¿Estás seguro de que quieres eliminar{' '}
            <Text style={styles.highlightChannel}>#{channel.name}</Text>? Todos
            los mensajes dentro de este canal se perderán de manera permanente. Esta
            acción no se puede deshacer.
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
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
              style={[styles.deleteButton, loading && styles.deleteButtonDisabled]}
              onPress={handleConfirmDelete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.deleteButtonText}>Eliminar canal</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(237, 66, 69, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.pageTitle,
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
  },
  description: {
    ...typography.helperText,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  highlightChannel: {
    color: colors.text,
    fontWeight: '700',
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  cancelText: {
    color: colors.text,
    fontWeight: '500',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
})

