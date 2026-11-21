import { Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { imageFileError, type UploadableFile } from '@discordia/core'

/** Imagen elegida de la galería, lista para la vista previa (uri) y para subir (toUploadFile). */
export interface PickedImage {
  uri: string
  mimeType: string
  fileName: string
  /** Solo en la web: el File que da el selector, listo para FormData. */
  file?: File
}

export type PickResult = { image: PickedImage } | { error: string } | null

const MIME_BY_EXTENSION: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const EXTENSION_BY_MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/**
 * Abre la galería para elegir una imagen cuadrada (avatar o ícono de servidor) y revisa formato y tamaño
 * con las mismas reglas que la web y el backend. null si se canceló.
 */
export function pickSquareImage(defaultName: string): Promise<PickResult> {
  return pickImage(defaultName, { allowsEditing: true, aspect: [1, 1] })
}

/**
 * Lo mismo para un banner 16:9. El recorte con proporción solo existe en Android: en iOS el recorte del
 * selector es siempre cuadrado, así que ahí (y en la web) se sube entera y Server-Roles la recorta al centro.
 */
export function pickBannerImage(defaultName: string): Promise<PickResult> {
  return pickImage(defaultName, Platform.OS === 'android' ? { allowsEditing: true, aspect: [16, 9] } : {})
}

async function pickImage(
  defaultName: string,
  crop: Pick<ImagePicker.ImagePickerOptions, 'allowsEditing' | 'aspect'>
): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) return { error: 'Necesitamos acceso a tus fotos para elegir una imagen.' }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    ...crop,
    quality: 0.8,
  })
  if (result.canceled) return null

  const asset = result.assets[0]
  // fileName y mimeType pueden venir vacíos según la plataforma: el tipo se deduce de la extensión.
  // Un HEIC de iPhone no pasa: el backend solo acepta JPEG, PNG o WebP
  const extension = (asset.fileName || asset.uri).split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  const mimeType = asset.mimeType || MIME_BY_EXTENSION[extension] || ''
  const error = imageFileError({ type: mimeType, size: asset.fileSize ?? 0 })
  if (error) return { error }

  return {
    image: {
      uri: asset.uri,
      mimeType,
      fileName: asset.fileName || `${defaultName}.${EXTENSION_BY_MIME[mimeType]}`,
      file: asset.file,
    },
  }
}

/** El archivo para subir: en la web un Blob; en iOS y Android, el { uri, name, type } de React Native. */
export async function toUploadFile(image: PickedImage): Promise<UploadableFile> {
  if (Platform.OS === 'web') return image.file ?? (await fetch(image.uri)).blob()
  return { uri: image.uri, name: image.fileName, type: image.mimeType }
}
