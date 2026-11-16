import { Platform } from 'react-native'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

/**
 * Guarda un texto como archivo en el cache de la app y abre la hoja de compartir del sistema (Guardar en
 * Archivos, Drive, mail…). Es el equivalente mobile de la descarga de la web. El cache lo puede limpiar el
 * sistema: el archivo es temporal, solo para pasarlo a otra app.
 *
 * @throws Error si el dispositivo no puede compartir archivos
 */
export async function shareTextFile(filename: string, content: string, mimeType: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir archivos.')
  }

  const file = new File(Paths.cache, filename)
  // Exportar dos veces el mismo período reemplaza el archivo anterior
  file.create({ overwrite: true })
  await file.write(content)

  // En iOS el mimeType agrega una extensión al nombre (quedaría "….csv.csv"): ahí alcanza con la del archivo
  await Sharing.shareAsync(
    file.uri,
    Platform.OS === 'android' ? { mimeType, dialogTitle: filename } : undefined,
  )
}
