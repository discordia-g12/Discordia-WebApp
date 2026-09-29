import React, { useState } from 'react'
import { Modal, View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, Image } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { X } from 'lucide-react-native'
import { colors, spacing, radii, typography } from '../../theme'
import { useAuth } from '../../providers/AppProviders'
import { updateMyProfile, uploadMyAvatar, PickedImage } from '../../api/auth'

interface EditProfileModalProps {
  visible: boolean
  onClose: () => void
}

export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { userProfile, updateUserProfile, token } = useAuth()

  const [displayName, setDisplayName] = useState(userProfile?.display_name || '')
  const [bio, setBio] = useState(userProfile?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || '')
  const [newAvatar, setNewAvatar] = useState<PickedImage | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Actualizar estados locales cuando el perfil cargue por si demora
  React.useEffect(() => {
    if (visible && userProfile) {
      setDisplayName(userProfile.display_name || '')
      setBio(userProfile.bio || '')
      setAvatarUrl(userProfile.avatar_url || '')
      setNewAvatar(null)
    }
  }, [visible, userProfile])

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para elegir un avatar.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (result.canceled) return
    const asset = result.assets[0]
    setNewAvatar({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName })
  }

  const handleSave = async () => {
    if (!userProfile) return
    setIsLoading(true)
    try {
      // 1) Si eligió una imagen nueva, se sube al endpoint PATCH /profile/avatar
      let uploadedAvatarUrl: string | null | undefined = userProfile.avatar_url
      if (newAvatar) {
        const withAvatar = await uploadMyAvatar(newAvatar, token)
        uploadedAvatarUrl = withAvatar.avatar_url
      }

      // El backend en /api/v1/users/me requiere username, bio, avatar_url en el POST. 
      // El backend no tiene display_name en el Pydantic pero el Frontend API le pasa display_name y mapea.
      // 2) Texto del perfil (el avatar ya se guardó arriba, no se reenvía como URL)
      const updatedProfile = await updateMyProfile({
        display_name: displayName,
        bio: bio,
      })

      updateUserProfile({
        ...userProfile,
        display_name: updatedProfile.display_name,
        avatar_url: uploadedAvatarUrl ?? updatedProfile.avatar_url,
        bio: updatedProfile.bio
      })

      Alert.alert('Éxito', 'Perfil actualizado correctamente.', [{ text: 'OK', onPress: onClose }])
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

            <Text style={styles.label}>Avatar</Text>
            <Pressable style={styles.avatarPicker} onPress={pickAvatar} disabled={isLoading}>
              {(newAvatar?.uri || avatarUrl) ? (
                <Image source={{ uri: newAvatar?.uri || avatarUrl }} style={styles.avatarPreview} />
              ) : (
                <View style={[styles.avatarPreview, styles.avatarEmpty]} />
              )}
              <Text style={styles.avatarPickerText}>
                {newAvatar ? 'Cambiar imagen elegida' : 'Elegir imagen'}
              </Text>
            </Pressable>

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
  avatarPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: spacing.md,
  },
  avatarEmpty: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarPickerText: {
    color: colors.accent,
    fontWeight: '600',
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