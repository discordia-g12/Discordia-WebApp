import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { ApiError, imageUploadErrorMessage, updateMyProfile, uploadMyAvatar } from '@discordia/core'
import { useAuth, useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { ActionLink, Modal, ModalActions, ModalForm, SquareAvatar, Text, UnderlineInput } from '../../ui'
import { pickSquareImage, toUploadFile, type PickedImage } from '../../utils/images'

interface EditProfileModalProps {
  visible: boolean
  onClose: () => void
}

/** Editar el perfil propio: avatar (se sube aparte), nombre visible y bio, con la vista previa arriba. */
export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const styles = useStyles()
  const { userProfile, updateUserProfile } = useAuth()
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
    const picked = await pickSquareImage('avatar')
    if (!picked) return
    if ('error' in picked) {
      showToast(picked.error, 'error')
      return
    }
    setNewAvatar(picked.image)
  }

  const handleSave = async () => {
    if (!userProfile) return
    if (!displayName.trim()) {
      setError('El nombre no puede quedar vacío.')
      return
    }
    setIsLoading(true)
    setError(null)
    // 1) Si eligió una imagen nueva, se sube a PATCH /profile/avatar (core; en iOS y Android va por XHR)
    let uploadedAvatarUrl: string | null | undefined
    if (newAvatar) {
      try {
        const withAvatar = await uploadMyAvatar(await toUploadFile(newAvatar), newAvatar.fileName)
        uploadedAvatarUrl = withAvatar.avatar_url
      } catch (err) {
        setError(err instanceof ApiError ? imageUploadErrorMessage(err) : 'No se pudo subir la imagen.')
        setIsLoading(false)
        return
      }
    }
    try {
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
      if (uploadedAvatarUrl) {
        // El avatar sí quedó guardado (y el anterior ya no existe): se aplica igual
        updateUserProfile({ ...userProfile, avatar_url: uploadedAvatarUrl })
        setNewAvatar(null)
      }
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
