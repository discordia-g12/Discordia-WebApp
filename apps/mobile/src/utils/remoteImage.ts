import { Platform, type ImageURISource } from 'react-native'

/**
 * El bucket de S3 sirve avatares, íconos y banners solo si el pedido trae el Referer de una página de
 * Discordia (infra/terraform/storage.tf, media_allowed_referers). El navegador lo manda solo; las apps
 * nativas no mandan Referer, así que se agrega acá.
 */
export const MEDIA_REFERER = 'https://app.discordia.lol/'

/**
 * Fuente de <Image> para una imagen remota (avatar, ícono, banner o adjunto). Una URI local (la imagen
 * recién elegida de la galería) o en la web va tal cual.
 */
export function remoteImage(uri: string): ImageURISource {
  if (Platform.OS === 'web' || !/^https?:\/\//i.test(uri)) return { uri }
  return { uri, headers: { Referer: MEDIA_REFERER } }
}
