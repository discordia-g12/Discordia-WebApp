import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * Configuración dinámica sobre app.json. Lo único que cambia según el build es el tráfico HTTP sin cifrar en
 * Android: hace falta en desarrollo (http://10.0.2.2:8000, la IP de la máquina que corre Metro) y no en los
 * builds de preview y production, que hablan solo con https://api.discordia.lol.
 *
 * APP_VARIANT viene del `env` de cada perfil de eas.json, que EAS expone al evaluar esta config tanto en la
 * máquina como en sus servidores (EAS_BUILD_PROFILE no: no existe al evaluarla localmente). Sin APP_VARIANT
 * (expo start, expo run, perfil development) se trata como desarrollo.
 */
const RELEASE_VARIANTS = ['preview', 'production']
const isRelease = RELEASE_VARIANTS.includes(process.env.APP_VARIANT ?? '')

type PluginEntry = NonNullable<ExpoConfig['plugins']>[number]

function withCleartextTraffic(plugin: PluginEntry): PluginEntry {
  if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') return plugin
  const options = (plugin[1] ?? {}) as { android?: Record<string, unknown> }
  return ['expo-build-properties', { ...options, android: { ...options.android, usesCleartextTraffic: !isRelease } }]
}

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    plugins: (config.plugins ?? []).map(withCleartextTraffic),
  }) as ExpoConfig
