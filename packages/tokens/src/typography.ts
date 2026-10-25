/**
 * Tipografía: Schibsted Grotesk (Google Fonts, 400 a 900) en tres escalas: gigante (display y marca
 * de agua), cuerpo y metadato. Medidas tomadas del PDF (artboard de 1440 px de ancho); los metadatos
 * del PDF (7–8 px) se subieron a 11 px para que se lean.
 */

export type FontWeight = 400 | 500 | 600 | 700 | 800 | 900;

export const fontFamily = {
  /** Web: la fuente con respaldo del sistema mientras carga. */
  web: "'Schibsted Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  /**
   * Mobile: en React Native cada peso es una familia distinta. Son los nombres que exporta
   * @expo-google-fonts/schibsted-grotesk (se cargan con useFonts).
   */
  native: {
    400: 'SchibstedGrotesk_400Regular',
    500: 'SchibstedGrotesk_500Medium',
    600: 'SchibstedGrotesk_600SemiBold',
    700: 'SchibstedGrotesk_700Bold',
    800: 'SchibstedGrotesk_800ExtraBold',
    900: 'SchibstedGrotesk_900Black',
  } satisfies Record<FontWeight, string>,
};

export interface TextStyleToken {
  /** Tamaño en px en pantallas grandes. */
  size: number;
  /** Tamaño mínimo (pantallas chicas) para los textos gigantes; la web interpola con clamp(). */
  minSize?: number;
  /** Interlineado relativo al tamaño. */
  lineHeight: number;
  /** Espaciado entre letras en em. */
  letterSpacing: number;
  weight: FontWeight;
  uppercase?: boolean;
}

export const textStyles = {
  // Escala gigante
  /** Marca de agua cortada al pie de la barra lateral ("AMIGOS", nombre del servidor). */
  watermark: { size: 120, minSize: 72, lineHeight: 0.8, letterSpacing: -0.04, weight: 900, uppercase: true },
  /** Palabras gigantes como navegación (INICIAR SESIÓN / REGISTRARSE, menú de ajustes). */
  display: { size: 56, minSize: 36, lineHeight: 0.95, letterSpacing: -0.02, weight: 400, uppercase: true },

  // Escala de cuerpo
  /** Títulos de estados vacíos y de celdas ("por ahora todo está tranquilo"). */
  heading: { size: 18, lineHeight: 1.25, letterSpacing: -0.01, weight: 700 },
  /** Texto de los mensajes. */
  body: { size: 15, lineHeight: 1.45, letterSpacing: 0, weight: 400 },
  /** Campos, canales, listas. */
  bodySmall: { size: 13, lineHeight: 1.4, letterSpacing: 0, weight: 400 },

  // Escala de metadato
  /** Etiquetas de sección con barra final ("MENSAJES DIRECTOS /"). */
  label: { size: 11, lineHeight: 1.3, letterSpacing: 0.02, weight: 700, uppercase: true },
  /** Horas, estados ("Conectado/"), ayudas de los campos. */
  meta: { size: 11, lineHeight: 1.35, letterSpacing: 0, weight: 400 },
} satisfies Record<string, TextStyleToken>;

export type TextStyleName = keyof typeof textStyles;

/** Ancho del artboard del PDF: los textos gigantes escalan con el viewport tomando este ancho como base. */
export const DESIGN_WIDTH = 1440;
