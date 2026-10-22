import React, { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { X, Copy } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'
import { useUI } from '../../providers/AppProviders'
import { colors, radii, spacing, typography } from '../../theme'
import { createInvite } from '@shared/api/servers'
import type { Server } from '../../types'

interface InviteModalProps {
  visible: boolean
  server?: Server
  onClose: () => void
}

export default function InviteModal({
  visible,
  server,
  onClose,
}: InviteModalProps) {
  const { showToast } = useUI()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!server) return
    setLoading(true)
    setError(null)
    try {
      const res = await createInvite(server.id, { maxUses: 10, expiresInSeconds: 86400 })
      setInviteCode(res.code)
    } catch (err: any) {
      setError(err?.message || 'Error al generar la invitación.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode)
      showToast?.('Código copiado al portapapeles', 'success')
      handleClose()
    }
  }

  const handleClose = () => {
    if (loading) return
    setError(null)
    setInviteCode(null)
    onClose()
  }

  if (!server) return null

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Invitar amigos</Text>
            <Pressable onPress={handleClose} disabled={loading} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Generá un código para que tus amigos se unan a {server.name}.
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!inviteCode ? (
            <Pressable style={styles.submitButton} onPress={handleGenerate} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Generar código</Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{inviteCode}</Text>
              <Pressable style={styles.copyButton} onPress={handleCopy}>
                <Copy color="#fff" size={18} />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 400, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.borderStrong },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  title: { ...typography.pageTitle, color: colors.text, fontSize: 20 },
  closeButton: { padding: spacing.xs },
  subtitle: { ...typography.helperText, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 18 },
  errorBox: { backgroundColor: 'rgba(237, 66, 69, 0.15)', borderRadius: radii.sm, padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.danger },
  errorText: { ...typography.metadata, color: colors.danger },
  submitButton: { backgroundColor: colors.accent, paddingVertical: spacing.sm + 2, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  submitText: { ...typography.button, color: colors.accentFg, fontWeight: '600' },
  codeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radii.sm, paddingLeft: spacing.md, borderWidth: 1, borderColor: colors.border },
  codeText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600', letterSpacing: 1 },
  copyButton: { backgroundColor: colors.accent, padding: spacing.md, borderTopRightRadius: radii.sm, borderBottomRightRadius: radii.sm },
})
