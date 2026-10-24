import { Platform, type TextStyle } from 'react-native'

/**
 * Sin el anillo de foco del navegador en los campos (react-native-web): el foco lo marcan las líneas del
 * campo. En nativo no hace falta, y el tipo de React Native no admite outlineStyle 'none'.
 */
export const noWebOutline: TextStyle = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {}
