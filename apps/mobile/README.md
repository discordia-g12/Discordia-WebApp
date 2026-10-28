# Discordia Mobile

App mobile de Discordia (Expo SDK 58, React Native 0.88). Vive en el monorepo de `Discordia-WebApp` (ver el [README de la raíz](../../README.md)) y comparte con el cliente web la capa de API y los tipos de dominio a través del paquete `@discordia/core` (`packages/core`).

Las decisiones técnicas de la voz en mobile (development build, Expo Go, hooks propios) están en [`docs/ADR-01-Mobile-Voice.md`](../../docs/ADR-01-Mobile-Voice.md).

## Diseño

La app usa el mismo lenguaje visual que la web ([`docs/ADR-02-Lenguaje-Visual.md`](../../docs/ADR-02-Lenguaje-Visual.md)) y los mismos tokens:

- **Tema:** `src/theme/ThemeProvider` arma `nativeTheme()` de `@discordia/tokens` en claro y oscuro. Se usa con `useTheme()`, y con `makeStyles` para los estilos que dependen del tema. Por defecto sigue al sistema; la elección de *Perfil → ajustes → Experiencia* se guarda en AsyncStorage. La app no se dibuja hasta cargar Schibsted Grotesk (400, 700 y 900, `src/theme/fonts.ts`).
- **Componentes:** `src/ui/` tiene el mismo catálogo que la web (`apps/web/src/ui`), con los mismos nombres y props: `Text`, `Logo`, `Background`, `DisplayText`, `SectionLabel`, `UnderlineInput`, `ActionLink`, `BlockButton`, `Tabs`, `Choice`, `SquareAvatar`, `ServerStrip`, `Toast`, `EmptyState`, `Skeleton`, `ConnectionBanner` y `Modal`. Las pantallas no definen colores ni medidas propios: todo sale del tema.
- **Movimiento:** `Animated` y `LayoutAnimation` (`src/ui/motion.ts`), con las duraciones y curvas de los tokens. Con "reducir movimiento" activado en el sistema, quedan fundidos de 150 ms.
- **Catálogo:** `npm run web -w @discordia/mobile` (Expo web) y abrir la URL con `?catalogo`. El tema se cambia desde el selector del catálogo.

## Requisitos

- Node 22 y las dependencias instaladas **desde la raíz del repo**: `npm install` (no adentro de `apps/mobile`).
- El backend levantado desde el orchestrator (`docker compose up -d` en la raíz).
- `EXPO_PUBLIC_API_URL` en `.env` (ver `.env.example`). Si no se define, se usa la IP de la máquina que corre Metro, puerto `8000` (el Gateway).

## Correr la app

### Con Expo Go (todo menos la voz)

```bash
npm start            # = npx expo start --go
```

y escanear el QR con Expo Go. **Ojo:** como el proyecto tiene `expo-dev-client`, `npx expo start` a secas arranca en modo development build y su QR no abre en Expo Go; hay que usar `npm start` / `--go`, o apretar `s` en la terminal de Metro para cambiar de modo.

Funciona todo excepto la voz: Expo Go no trae el módulo nativo de WebRTC que usa LiveKit, así que la app lo detecta (`src/utils/voice.ts`) y no carga LiveKit.

### Con el development build (incluye la voz)

La voz usa LiveKit (`@livekit/react-native` + `@livekit/react-native-webrtc`), que tiene código nativo. Para probarla hace falta un *development build*: la app de Discordia compilada con ese código nativo y con `expo-dev-client`, que hace que funcione como Expo Go (carga el JavaScript desde `npx expo start` y se recarga al guardar).

Se instala **una sola vez**. Solo hay que volver a generarlo cuando cambian dependencias nativas, los `plugins` de `app.json` o la versión del SDK de Expo; los cambios de código se ven al guardar, como con Expo Go.

### Opción A: EAS Build (sin Android Studio)

```bash
npx eas-cli@latest login                                              # cuenta de Expo con acceso al proyecto discordia_g12
npx eas-cli@latest build --profile development --platform android   # genera el APK en la nube
```

Al terminar, EAS da un link/QR para descargar e instalar el APK en el teléfono o el emulador. El link se puede compartir con el resto del equipo para no compilarlo de nuevo. Después:

```bash
npm run start:dev    # = npx expo start --dev-client
```

y escanear el QR con la **cámara** del teléfono (o desde la app instalada), no desde Expo Go.

### Opción B: build local

Requiere Android Studio con el SDK configurado (`ANDROID_HOME`) y un emulador o un teléfono conectado por USB:

```bash
npx expo run:android
```

Genera la carpeta `android/` (no se versiona: se regenera desde `app.json`), compila, instala y abre la app.

## Voz desde un teléfono físico

El voice-service le devuelve a la app la URL pública de LiveKit, y LiveKit le anuncia al cliente la IP por donde va el audio. Con los valores por defecto ambos son `localhost`/`127.0.0.1`, que **en el teléfono es el propio teléfono**. Para probar voz desde un dispositivo en la misma red, en el `.env` del orchestrator:

```bash
LIVEKIT_PUBLIC_URL=ws://<IP-de-tu-compu>:7880
LIVEKIT_NODE_IP=<IP-de-tu-compu>
```

y recrear los servicios: `docker compose up -d --force-recreate livekit voice-signaling-service`. El firewall de la compu tiene que permitir `7880/tcp`, `7881/tcp` y `7882/udp`.

La IP de la compu en la red local sirve a la vez para el navegador, el emulador y el teléfono, así que no hay que cambiarla según el cliente. No usar `10.0.2.2` (el `localhost` de la compu visto desde el emulador): la URL es una sola para todos los clientes y desde el navegador esa dirección no existe.

En la compu, la web se sigue abriendo como `http://localhost:5173`: el navegador solo da acceso al micrófono en `localhost` o con HTTPS, no en `http://<IP>:5173`.

## Permisos

Los agregan los config plugins al generar el build:

- Android: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, entre otros (`@config-plugins/react-native-webrtc`).
- iOS: `NSMicrophoneUsageDescription` / `NSCameraUsageDescription` con los textos definidos en `app.json`.

## HTTP sin cifrar (Android)

`app.config.ts` ajusta `app.json` según el build: Android permite HTTP sin cifrar solo en desarrollo
(`expo start`, `expo run:android`, perfil `development`), que es lo que usa el backend local
(`http://<IP>:8000`). Los perfiles `preview` y `production` de `eas.json` definen `APP_VARIANT` y quedan solo con
HTTPS (`https://api.discordia.lol`). Para un perfil nuevo que apunte a producción, agregarle `APP_VARIANT`.
