import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { updateMyProfile } from '@discordia/core'
import { useAuth, useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { ActionLink, Modal, ModalActions, ModalForm, SquareAvatar, Text, UnderlineInput } from '../../ui'
import { uploadMyAvatar, PickedImage } from '../../api/auth'

interface EditProfileModalProps {
  visible: boolean
  onClose: () => void
}

/** Editar el perfil propio: avatar (se sube aparte), nombre visible y bio, con la vista previa arriba. */
export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const styles = useStyles()
  const { userProfile, updateUserProfile, token } = useAuth()
  const { showToast } = useUI()
  const [displayName, setDisplayName] = useState(userProfile?.display_name || '')
  const [bio, setBio] = useState(userProfile?.bio || '')
  const [newAvatar, setNewAvatar] = useState<PickedImage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al abrir, los datos actuales (el perfil puede llegar después)
  useEffect(() => {
    if (visible && userProfile) {
      setDisplayName(userProfile.display_name || '')
      setBio(userProfile.bio || '')
      setNewAvatar(null)
      setError(null)
    }
  }, [visible, userProfile])

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      showToast('Necesitamos acceso a tus fotos para elegir un avatar', 'error')
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
    if (!displayName.trim()) {
      setError('El nombre no puede quedar vacío.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      // 1) Si eligió una imagen nueva, se sube a PATCH /profile/avatar
      let uploadedAvatarUrl: string | null | undefined = userProfile.avatar_url
      if (newAvatar) {
        const withAvatar = await uploadMyAvatar(newAvatar, token)
        uploadedAvatarUrl = withAvatar.avatar_url
      }
      // 2) Texto del perfil (el avatar ya se guardó arriba, no se reenvía como URL)
      const updatedProfile = await updateMyProfile({ display_name: displayName.trim(), bio })
      updateUserProfile({
        ...userProfile,
        display_name: updatedProfile.display_name,
        avatar_url: uploadedAvatarUrl ?? updatedProfile.avatar_url,
        bio: updatedProfile.bio,
      })
      showToast('Perfil actualizado', 'success')
      onClose()
    } catch (err) {
      setError((err instanceof Error && err.message) || 'Error al guardar el perfil.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) onClose()
  }

  const name = displayName.trim() || userProfile?.username || ''

  return (
    <Modal visible={visible && !!userProfile} title="Editar perfil" onClose={handleClose}>
      {userProfile && (
        <ModalForm>
          {/* Vista previa: la franja del banner y el avatar cuadrado encima */}
          <View>
            <View style={styles.banner}>
              <Text variant="meta" tone="muted">
                / banner: próximamente
              </Text>
            </View>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <SquareAvatar user={{ username: userProfile.username, displayName: name, avatar: newAvatar?.uri ?? userProfile.avatar_url }} size={64} />
              </View>
              <View style={styles.identityText}>
                <Text variant="heading" numberOfLines={1}>
                  {name}
                </Text>
                <Text variant="meta" tone="muted">
                  @{userProfile.username}
                </Text>
              </View>
            </View>
            <ActionLink onPress={pickAvatar} disabled={isLoading}>
              {newAvatar ? 'elegir otro avatar' : 'cambiar avatar'}
            </ActionLink>
          </View>
          <UnderlineInput
            label="nombre visible"
            required
            value={displayName}
            onChangeText={text => {
              setDisplayName(text)
              if (error) setError(null)
            }}
            maxLength={32}
            error={error ?? undefined}
            disabled={isLoading}
          />
          <UnderlineInput
            label="sobre mí"
            value={bio}
            onChangeText={setBio}
            placeholder="contá algo de vos"
            maxLength={190}
            multiline
            hint={`${bio.length}/190`}
            disabled={isLoading}
          />
          <ModalActions submitLabel="Guardar" onSubmit={handleSave} onCancel={handleClose} loading={isLoading} />
        </ModalForm>
      )}
    </Modal>
  )
}

const useStyles = makeStyles(t => ({
  banner: {
    height: 72,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: t.space[2],
    backgroundColor: t.colors.line,
  },
  identity: { flexDirection: 'row', alignItems: 'flex-end', gap: t.space[3], marginTop: -t.space[6], marginBottom: t.space[3], paddingLeft: t.space[3] },
  avatar: { borderWidth: 3, borderColor: t.colors.background },
  identityText: { flex: 1, paddingBottom: t.space[1] },
}))
