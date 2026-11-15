import { useCallback } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { validateAttachmentFile } from '@discordia/core'
import type { PendingAttachment } from '../components/chat/Composer'
import { useUI } from '../providers/AppProviders'

/** Abre la galería y valida la imagen elegida. Resuelve en null si se canceló o no sirve (ya avisó con un toast). */
export function usePickAttachment(): () => Promise<PendingAttachment | null> {
  const { showToast } = useUI()

  return useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      })

      if (result.canceled || !result.assets || !result.assets[0]) return null

      const asset = result.assets[0]
      const name = asset.fileName || `imagen-${Date.now()}.jpg`
      const type = asset.mimeType || 'image/jpeg'
      const size = asset.fileSize

      const error = validateAttachmentFile({ name, type, size })
      if (error) {
        showToast(error, 'error')
        return null
      }

      return { uri: asset.uri, name, type, size }
    } catch {
      showToast('No se pudo seleccionar la imagen', 'error')
      return null
    }
  }, [showToast])
}
