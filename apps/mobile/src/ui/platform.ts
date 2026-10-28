import { Platform, type TextStyle } from 'react-native'

/**
 * Sin el anillo de foco del navegador en los campos (react-native-web): el foco lo marcan las líneas del
 * campo. En nativo no hace falta, y el tipo de React Native no admite outlineStyle 'none'.
 */
export const noWebOutline: TextStyle = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {}

/**
 * behavior de KeyboardAvoidingView para las dos plataformas. En Android, Expo (SDK 54+) dibuja la app
 * edge-to-edge y el sistema ya no achica la ventana al abrir el teclado: sin un behavior, el teclado tapa
 * los campos de abajo. Con 'padding' el componente mide el teclado y deja ese espacio libre, en Android
 * igual que en iOS.
 */
export const keyboardAvoidingBehavior = 'padding' as const
