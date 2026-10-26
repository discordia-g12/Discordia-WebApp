## ADR 01: Voz en la aplicación mobile (LiveKit en Expo)

**Contexto:**
La voz usa LiveKit (ADR 0007 del repo `.github`): el voice-service firma un token y el cliente se conecta directo a la SFU. En el cliente web alcanza con `livekit-client`, porque el navegador trae WebRTC. En React Native no: hace falta `@livekit/react-native` + `@livekit/react-native-webrtc`, que incluyen código nativo.

La app mobile es Expo (SDK 57, React Native 0.86) y el equipo la venía probando con **Expo Go**, una app ya compilada que solo trae los módulos nativos del SDK de Expo. El ADR 0009 ya anticipaba que WebRTC iba a requerir un *development build*; este ADR registra cómo se resolvió y otras decisiones técnicas que surgieron al implementar la voz en mobile (historias #1, #2, #3, #4, #16 y #22).

Además, mobile comparte con la web la capa de API (`@shared/*` → `../src/*`, vía `watchFolders` de Metro), lo que trajo dos restricciones al reutilizar código.

**Decisión:**

1. **Development build para la voz.** Se agregan `expo-dev-client`, `@livekit/react-native`, `@livekit/react-native-webrtc`, `livekit-client` y los config plugins `@livekit/react-native-expo-plugin` y `@config-plugins/react-native-webrtc` (con los textos de permisos de micrófono/cámara en `app.json`). El APK de desarrollo (`eas build --profile development`) se genera una vez y solo se regenera ante cambios nativos (dependencias nativas, plugins, versión del SDK); el código JavaScript se sigue cargando desde Metro.
2. **Expo Go sigue funcionando para todo menos la voz.** Al arrancar (`index.ts` → `src/utils/voice.ts`) se verifica si existe el módulo nativo (`NativeModules.WebRTCModule`, el mismo chequeo que hace `@livekit/react-native-webrtc`). Si no existe, no se registra LiveKit y al tocar un canal de voz se muestra un aviso. No se usa `Constants.executionEnvironment`: en SDK 57 `StoreClient` significa "Expo Go **o** development build" y no permite distinguirlos.
3. **LiveKit se carga con `require` en tiempo de ejecución**, solo si hay módulo nativo. Un `import` estático cargaría el paquete también en Expo Go.
4. **`npm start` = `expo start --go`** y `npm run start:dev` para el development build: con `expo-dev-client` instalado, `npx expo start` arranca por defecto en modo development build y su QR no abre en Expo Go.
5. **Hooks de voz propios de mobile** (`useVoiceRoom`, `useVoicePresence`), con la misma lógica y el mismo protocolo que los de la web. El código compartido resuelve `react` desde el `node_modules` de la web (React 18), mientras que mobile usa React 19; un hook compartido cargaría dos copias de React y fallaría con "Invalid hook call". Las funciones de API compartidas que no usan React (`@shared/api/voice`, `client`, `errors`) sí se reutilizan.
6. **Perfiles de participantes vía `POST /api/v1/users/bulk` directo**, con el cliente compartido, en lugar de `getUsersBulk` de `@shared/api/users`, que usa `import.meta.env` (Vite) y Metro no lo soporta.
7. **Diferencias de plataforma en `useVoiceRoom` mobile:** el audio remoto lo reproduce LiveKit (en la web hay que crear elementos `<audio>`); se abre la sesión de audio del teléfono (`AudioSession.startAudioSession`) antes de conectar; en Android el permiso de micrófono se pide en tiempo de ejecución y, si se niega, el usuario entra **silenciado** en lugar de fallar el join.
8. **Desarrollo con teléfono físico:** `LIVEKIT_PUBLIC_URL` y `LIVEKIT_NODE_IP` (orchestrator) apuntan a la IP de la computadora en la red local, un único valor que sirve para navegador, emulador y teléfono. La web se sigue abriendo en `localhost` (el navegador solo da micrófono en `localhost` o HTTPS).

**Alternativas descartadas:**

| Alternativa | Por qué se descartó |
|---|---|
| Voz que funcione en Expo Go | No existe: cualquier SDK de voz/video (LiveKit, Agora, Daily) requiere código nativo. |
| Obligar a todo el equipo a usar el development build | Cambia el flujo de trabajo de todos aunque no toquen voz. La detección del módulo nativo mantiene Expo Go para el resto. |
| Detectar Expo Go con `Constants.executionEnvironment` | En SDK 57 no distingue Expo Go de un development build. |
| Compartir los hooks de voz con la web | Dos versiones de React en el bundle (ver Decisión 5). Para eliminar la duplicación habría que mover la lógica sin React a un módulo compartido o configurar Metro para resolver un único React; se dejó para cuando la duplicación justifique el cambio. |
| `10.0.2.2` como host de LiveKit para el emulador | La URL pública es una sola para todos los clientes y esa dirección no existe para el navegador ni para un teléfono físico. |

**Consecuencias:**

* Para probar voz en el teléfono hay que instalar el development build una vez; el link de EAS se comparte con el equipo. Para todo lo demás se sigue usando Expo Go con `npm start`.
* Lógica de voz duplicada entre web y mobile (dos `useVoiceRoom`, dos `useVoicePresence`): un cambio de comportamiento hay que hacerlo en ambos.
* En mobile, mute/deafen no se recuerdan al reiniciar la app (la web los guarda en `localStorage`); haría falta `AsyncStorage`.
* La app mobile no tiene tests automatizados (no hay Jest configurado); la voz en mobile se verificó manualmente con un development build en Android. iOS no se probó.
* El APK de entrega (`preview`/producción) incluirá el código nativo de WebRTC y los permisos de micrófono.

**Actualización (22/10/2026, paso 1.2 de `docs/TODO-REDISENO.md`):**
Con el monorepo hay una sola copia de React (19) y la lógica compartida vive en `@discordia/core`, sin `import.meta.env`. Eso elimina las dos restricciones que motivaron las decisiones 5 y 6:

* La decisión 5 queda reemplazada: `useVoiceRoom` y `useVoicePresence` son los de `@discordia/core`, iguales en web y mobile. Lo que cambia por plataforma (cargar LiveKit con `require`, abrir la sesión de audio, pedir el permiso de micrófono en Android, reproducir el audio en la web con `<audio>`) lo aporta un adaptador `VoicePlatform`; el de mobile está en `apps/mobile/src/utils/voice.ts`. Las decisiones 1 a 4 (development build, detección del módulo nativo, `require` en tiempo de ejecución, `expo start --go`) siguen vigentes.
* La decisión 6 queda reemplazada: los perfiles se piden con `getUsersBulk` de core, el mismo que usa la web.
* Ya no hay lógica de voz duplicada. Sigue pendiente recordar mute/deafen en mobile: `VoicePlatform.prefs` lo soporta, pero necesita un storage síncrono y `AsyncStorage` no lo es.
