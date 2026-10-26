import { useFonts } from 'expo-font'
import { fontFamily } from '@discordia/tokens'
import { SchibstedGrotesk_400Regular } from '@expo-google-fonts/schibsted-grotesk/400Regular'
import { SchibstedGrotesk_700Bold } from '@expo-google-fonts/schibsted-grotesk/700Bold'
import { SchibstedGrotesk_900Black } from '@expo-google-fonts/schibsted-grotesk/900Black'

/**
 * Schibsted Grotesk en los pesos de la escala (400, 700 y 900, los mismos que sirve la web). Cada peso es
 * una familia (fontFamily.native de los tokens). Devuelve true cuando se puede dibujar: con las fuentes
 * listas o si fallaron (se sigue con la del sistema antes que dejar la app en blanco).
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    [fontFamily.native[400]]: SchibstedGrotesk_400Regular,
    [fontFamily.native[700]]: SchibstedGrotesk_700Bold,
    [fontFamily.native[900]]: SchibstedGrotesk_900Black,
  })
  return loaded || error !== null
}
