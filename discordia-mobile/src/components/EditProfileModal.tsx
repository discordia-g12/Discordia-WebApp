import React, { useState } from 'react'
import { Modal, View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native'
import { X } from 'lucide-react-native'
import { colors, spacing, radii, typography } from '../theme'
import { useAuth } from '../providers/AppProviders'
import { upsertMyProfile } from '../api/auth'

interface EditProfileModalProps {
  visible: boolean
  onClose: () => void
}

export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { userProfile } = useAuth()
  
  const [displayName, setDisplayName] = useState(userProfile?.display_name || '')
  const [bio, setBio] = useState(userProfile?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || '')
  const [isLoading, setIsLoading] = useState(false)

  // Actualizar estados locales cuando el perfil cargue por si demora
  React.useEffect(() => {
    if (visible && userProfile) {
      setDisplayName(userProfile.display_name || '')
      setBio(userProfile.bio || '')
      setAvatarUrl(userProfile.avatar_url || '')
    }
  }, [visible, userProfile])

  const handleSave = async () => {
    if (!userProfile) return
    setIsLoading(true)
    try {
      // El backend en /api/v1/users/me requiere username, bio, avatar_url en el POST. 
      // El backend no tiene display_name en el Pydantic pero el Frontend API le pasa display_name y mapea.
      await upsertMyProfile({
        username: userProfile.username, // el username no se puede cambiar por diseño, es inmutable
        display_name: displayName,
        avatar_url: avatarUrl,
        bio: bio,
      } as any)
      
      Alert.alert('Éxito', 'Perfil actualizado correctamente. Los cambios se verán en tu próximo inicio de sesión o si recargas.', [{ text: 'OK', onPress: onClose }])
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al guardar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar Perfil</Text>
            <Pressable style={styles.actionBtn} onPress={onClose} disabled={isLoading}>
              <X color={colors.textMuted} size={24} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Nombre para mostrar</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Tu nombre visible"
              placeholderTextColor={colors.textDim}
            />

            <Text style={styles.label}>Avatar URL</Text>
            <TextInput
              style={styles.input}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              placeholderTextColor={colors.textDim}
            />

            <Text style={styles.label}>Sobre mí</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Escribe algo sobre ti..."
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={4}
              maxLength={190}
            />

            <Pressable 
              style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]} 
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.pageTitle,
    color: colors.text,
  },
  actionBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  label: {
    ...typography.sectionTitle,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    marginBottom: spacing.md,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
})
