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
import { useData, useUI } from '../../providers/AppProviders'
import { joinServerViaInvite } from '../../api/servers'
import { colors, radii, spacing, typography } from '../../theme'
import type { Server } from '../../types'

interface CreateServerModalProps {
  visible: boolean
  onClose: () => void
  onSuccess?: (server: Server) => void
}

export default function CreateServerModal({
  visible,
  onClose,
  onSuccess,
}: CreateServerModalProps) {
  const { createServer } = useData()
  const { selectServer, selectChannel, showToast } = useUI()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('El nombre del servidor no puede estar vacío.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const server = await createServer(trimmed)
      setName('')
      onClose()
      selectServer(server.id)
      if (server.channels && server.channels.length > 0) {
        selectChannel(server.channels[0].id)
      }
      showToast?.(`Servidor "${server.name}" creado con éxito.`, 'success')
      onSuccess?.(server)
    } catch (err: any) {
      setError(err?.message || 'Error al crear el servidor. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const { refreshServers } = useData()

  const handleJoin = async () => {
    const trimmed = inviteCode.trim()
    if (!trimmed) {
      setError('El código no puede estar vacío.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await joinServerViaInvite(trimmed)
      await refreshServers() // Refresh server list
      setInviteCode('')
      setIsJoining(false)
      onClose()
      selectServer(res.server_id)
      showToast?.(`Te uniste al servidor con éxito.`, 'success')
    } catch (err: any) {
      setError(err?.message || 'Código inválido o expirado.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setError(null)
    setName('')
    setInviteCode('')
    setIsJoining(false)
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
            <Text style={styles.title}>{isJoining ? 'Unirse a un servidor' : 'Creá tu servidor'}</Text>
            <Pressable onPress={handleClose} disabled={loading} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            {isJoining 
              ? 'Ingresá el código de invitación para unirte a una comunidad existente.' 
              : 'Tu servidor es donde tus amigos y vos pueden reunirse. Dale un nombre para empezar.'}
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>{isJoining ? 'CÓDIGO DE INVITACIÓN' : 'NOMBRE DEL SERVIDOR'}</Text>
          <TextInput
            style={styles.input}
            value={isJoining ? inviteCode : name}
            onChangeText={t => {
              if (isJoining) setInviteCode(t)
              else setName(t)
              if (error) setError(null)
            }}
            placeholder={isJoining ? "Ej. xyz123" : "Ej. Servidor de Juegos"}
            placeholderTextColor={colors.textDim}
            maxLength={100}
            autoFocus
            editable={!loading}
          />

          <View style={styles.actions}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                if (isJoining) setIsJoining(false)
                else handleClose()
              }}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{isJoining ? 'Atrás' : 'Cancelar'}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.submitButton,
                ((isJoining ? !inviteCode.trim() : !name.trim()) || loading) && styles.submitButtonDisabled,
              ]}
              onPress={isJoining ? handleJoin : handleCreate}
              disabled={(isJoining ? !inviteCode.trim() : !name.trim()) || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>{isJoining ? 'Unirse' : 'Crear'}</Text>
              )}
            </Pressable>
          </View>
          
          {!isJoining && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>¿Ya tenés una invitación?</Text>
              <Pressable onPress={() => { setError(null); setIsJoining(true); }} hitSlop={8}>
                <Text style={styles.footerLink}>Unirse a un servidor</Text>
              </Pressable>
            </View>
          )}
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
    maxWidth: 400,
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
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.pageTitle,
    color: colors.text,
    fontSize: 20,
  },
  closeButton: {
    padding: spacing.xs,
  },
  subtitle: {
    ...typography.helperText,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 18,
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
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
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
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    ...typography.metadata,
    color: colors.textMuted,
  },
  footerLink: {
    ...typography.button,
    color: colors.accent,
    fontSize: 14,
  },
})
