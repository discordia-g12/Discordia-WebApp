import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Preferencias chicas del dispositivo (intro vista, tema). Si el storage falla, se sigue sin ellas: la
 * intro vuelve a salir o el tema sigue al sistema, nunca se rompe la app.
 */
export async function readPreference(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key)
  } catch {
    return null
  }
}

export async function writePreference(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value)
  } catch {
    // sin storage: la preferencia dura hasta cerrar la app
  }
}
