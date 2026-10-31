# TODO: rediseño de Discordia (web + mobile)

> Creado el 22/10/2026. Referencia visual: `Rediseño de discord.pdf` (15 págs.), con capturas livianas en
> [`docs/design/`](design/README.md).
> Objetivo: que Discordia deje de verse como un clon de Discord y se sienta innovadora, con transiciones y
> efectos visuales.

## 1. Lenguaje visual

Estilo **editorial / suizo**: grilla de líneas finas, tipografía como protagonista, sin sombras ni bordes
redondeados. Todo lo que hoy es "Discord" (gris oscuro, azul violáceo, avatares redondos, burbujas) se va.

| Elemento | Regla |
|---|---|
| Fondo | Degradé de cielo vertical (`#a8dbef` → `#b3deef` → `#d5e9ef` → `#eaefef` → `#f2f2f0`) |
| Texto | Casi negro `#312f34`. Lo inactivo/secundario en gris (ver contraste) |
| Acento | Bloques **negros invertidos** (barra de usuario, etiqueta del rail, botón primario) |
| Líneas | 1px, divisorias de la grilla. Los títulos de sección quedan **cruzados por la línea** |
| Bordes / sombras | Radio 0. Sin sombras: la profundidad la dan las líneas y el contraste negro/cielo |
| Avatares | **Cuadrados**. Portadas de servidor como **franjas rectangulares** con imagen |
| Tipografía | **Schibsted Grotesk** (Google Fonts, pesos 400–900). Tres escalas: gigante (display), cuerpo, metadato |
| Display | Palabras gigantes en mayúsculas como navegación (activa negra, inactiva gris) y **marca de agua** al pie de la barra lateral con el contexto actual ("AMIGOS", nombre del servidor), entera y apoyada sobre la barra de usuario |
| Microcopy | Etiquetas con barra final (`MENSAJES DIRECTOS /`, `Conectado/`), acciones con guion bajo (`_editar`, `_mostrar`), canales con punto (`•general`) |
| Logo | "D" geométrica (`svg/logo discordia.svg`) |

### Contraste (WCAG AA)

El gris del diseño (`#b8babc`) da 1.3–1.7:1 sobre el cielo: no se lee. Se reemplaza por:

| Token | Color | Uso | Contraste sobre `#a8dbef` / `#d5e9ef` / `#f2f2f0` |
|---|---|---|---|
| `--color-text-muted` | `#50565c` | texto chico inactivo, metadatos | 5.0 / 5.9 / 6.6 (AA texto normal) |
| `--color-text-display-inactive` | `#6b7177` | palabras gigantes inactivas (≥ 24px) | 3.3 / 3.9 / 4.4 (AA texto grande) |
| `--color-text` | `#312f34` | todo lo demás | 8.9 / 10.5 / 11.8 |

`#b8babc` queda solo para decoración (marca de agua, líneas), nunca para texto que haya que leer.

Los tokens llevan prefijo por categoría (`--color-`, `--font-`, `--space-`, `--motion-`) para no chocar con
la paleta de Discord de `index.css` (`--text-muted`, `--bg-primary`), que sigue viva hasta el corte. El
contraste de cada par texto/fondo, en los dos temas y sobre cada parada del degradé, lo verifica un test de
`packages/tokens` (`contrast.test.ts`): un token que no llegue a AA no pasa el CI.

### Modo oscuro ("noche")

No está en el PDF: se deriva de la intro (pantalla negra con resplandor celeste). Se implementa con los mismos
tokens bajo `[data-theme="dark"]`, así que no requiere tocar componentes.

| Token | Claro | Oscuro |
|---|---|---|
| Fondo | degradé cielo | degradé noche `#0e1214` → `#1a2225`, con resplandor `#a8dbef` al pie |
| Texto | `#312f34` | `#f2f2f0` |
| Inactivo | `#50565c` / `#6b7177` | `#9aa0a6` (7:1) / `#7d858c` (5:1) |
| Bloque invertido | negro con texto claro | `#f2f2f0` con texto oscuro |
| Líneas | `#312f34` al ~25% | `#a8dbef` al ~20% |
| Líneas que marcan (bordes, pestaña activa) | `#312f34` | `#6b8794` (el blanco era duro; 4.3:1) |
| Celeste de un servidor (tinte / marca de agua) | cielo al 30% / `#a8dbef` | cielo al 6% / `#2b4550` |

- `tokens.css` ya trae el oscuro: con `data-theme="dark"`, o con `data-theme="system"` y la preferencia del
  sistema. Sin elección guardada, sigue al sistema (desde el paso 12).
- Por defecto sigue la preferencia del sistema (`prefers-color-scheme`). Selector manual en
  *Ajustes → Experiencia* (Claro / Oscuro / Sistema), guardado en `localStorage` (web) y `AsyncStorage` (mobile).
- MVP: se entrega el claro completo; el oscuro sale cuando todas las pantallas estén migradas a tokens (paso 12).

## 2. Movimiento

Librería: **`motion`** (ex framer-motion) en web. En mobile, `Animated` y `LayoutAnimation` de React Native
(sin dependencias nativas nuevas).

| Momento | Efecto |
|---|---|
| Primer ingreso | **Intro "amanecer"**: negro → resplandor celeste que sube (`gradiente 1`) → degradé claro (`gradiente 2`), ~4 s, se saltea con clic/tecla |
| Login ⇄ registro | Las palabras gigantes se intercambian (la activa sube y se oscurece), el formulario cruza con fundido |
| Arranque de la sesión | Sin pantalla propia: el login entra escalonado (campos y palabras) mientras se verifica por detrás |
| Cambio de vista | La marca de agua se transforma ("AMIGOS" → nombre del servidor) con un barrido horizontal |
| Rail | Al pasar el mouse la franja se **despliega** con la etiqueta negra (nombre + actividad) |
| Pestañas | Subrayado que se **desliza** a la pestaña activa |
| Mensajes | Entrada corta (opacidad + 8px hacia arriba), solo para mensajes nuevos, no al cargar historial |
| Voz | El mosaico se **reacomoda animado** al entrar/salir alguien; borde que pulsa en quien habla |
| Ajustes / modales | Entran desde el borde con una cortina de líneas; salen al revés |
| Fondo | Degradé con deriva muy lenta (60 s) |

Todo respeta `prefers-reduced-motion`: con esa preferencia, las transiciones quedan en fundidos de 150 ms y la
intro se omite.

## 3. Pantallas que el PDF no muestra

Se derivan del sistema:

- **Chat de DMs**: igual que el chat de canal. La columna izquierda es la lista de DMs; la marca de agua es el
  nombre del otro usuario; el encabezado reemplaza los enlaces de canal por `_perfil` y `_llamar`.
- **Modales** (crear servidor, invitar, confirmar, unirse): panel a ancho completo que baja desde arriba y
  ocupa ~60% de alto, con el título en display gigante a la izquierda y el formulario con campos subrayados a
  la derecha. Cerrar con `×` arriba a la derecha y con Esc.
  - **Confirmar**: título display (`¿ELIMINAR CANAL?`), texto chico, acciones `_cancelar` y bloque negro
    `ELIMINAR /`. Las acciones destructivas usan rojo `#c0392b` solo en el bloque.
- **Ajustes de servidor**: mismo esqueleto que los ajustes de usuario (pág. 11), con su menú gigante
  (`RESUMEN`, `ROLES`, `MIEMBROS`, `INVITACIONES`, `BANEOS`, `ELIMINAR`).
- **Toasts**: tira negra al pie, del ancho de la columna central, texto claro con barra final
  (`Mensaje enviado/`); entra desde abajo y se va sola a los 4 s. Errores: la misma tira con un borde
  izquierdo rojo de 4px y una acción `_reintentar`.
- **Banner de conexión**: línea de 2px arriba de toda la app que avanza en loop mientras reconecta, más el
  texto `reconectando/` en la barra de usuario.
- **Carga**: esqueletos de líneas (barras horizontales finas que laten) con la grilla ya dibujada, nunca
  spinners sobre fondo vacío.
- **Vacíos**: título en negrita + bajada chica con barra inicial, como "por ahora todo está tranquilo /
  cuando un amigo empiece una actividad aparecerá aquí".
- **Mobile web** (< 768px): ver sección 5.

## 4. Base técnica actual (web)

- React 18 + Vite + Zustand + React Query, sin router (las vistas se cambian por estado, `AppView`).
- (Antes del paso 1.4.) **1406 estilos `style={{...}}` en línea y 741 colores hex** en los componentes. `index.css` define los tokens
  de Discord (`--brand: #5865f2`, `--bg-primary: #313338`, ...).
- Más pesados: `ServerSettings` (249 estilos en línea), `UserSettings` (171), `MobileShell` (168),
  `ChatView` (94), `OwnProfileView` (86).
- Cloudflare Pages publica desde `main`: el rediseño vive detrás de un flag (`data-ui="nuevo"`) hasta el corte,
  para poder mergear de a poco sin publicar una app mitad vieja y mitad nueva. (El flag se borró en el paso 14.)

## 5. Mobile (React Native / Expo, `apps/mobile/`)

- Hoy usa `src/theme/` (colores, tipografía y espaciado de la paleta vieja; solo 59 hex en el código). En el
  paso 13 se reemplaza por `nativeTheme()` de `@discordia/tokens`, que ya trae los mismos valores que la web
  en formato `StyleSheet` (una familia por peso, sin `fontWeight`; los textos gigantes en su tamaño mínimo).
- Fuente: `@expo-google-fonts/schibsted-grotesk` + `expo-font`.
- Degradés y logo con `react-native-svg` (ya instalado), sin sumar `expo-linear-gradient`.
- Navegación: barra inferior (`Servidores`, `Mensajes`, `Notificaciones`, `Perfil`); el rail pasa a una tira
  horizontal de franjas arriba; la marca de agua queda como encabezado gigante de cada pantalla.
- La mobile web (`src/components/MobileShell.tsx` de la WebApp) sigue las mismas reglas que la app nativa.

## 6. Reestructuración previa: web y mobile sobre una base común

### Problema

- La mobile importa archivos sueltos del `src/` de la web con un alias (`@shared/* → ../src/*`): depende de
  la estructura de carpetas de la web y nada impide que importe código que solo funciona en el navegador.
  El paquete `shared-api` está vacío (`testShared = () => "hello"`).
- Lógica duplicada que ya divergió:

| Lógica | Web | Mobile |
|---|---|---|
| WebSocket del chat (reconexión y recuperación) | `useChatWebSocket` | `useChannelSocket` (otra implementación) |
| Sala de voz | `useVoiceRoom` (365 líneas) | `useVoiceRoom` (332), ~430 líneas de diferencia |
| Presencia de voz | `useVoicePresence` (101) | copia (99) |
| Perfiles | `useUserProfiles` (37) | otra versión (93) |
| Tipos | `types.ts` (398) | `types.ts` (294), parcialmente copiado |
| Auth | `auth/session` + `auth0` (~650) | `api/auth` (~400), contratos distintos |
| Datos de prueba | `data/mock.ts` (1092), importado por `api/users.ts` (solo en desarrollo) | `data/mock.ts` (637) |

- Versiones de React distintas (web 18, mobile 19).
- Web: `App.tsx` (1063 líneas, 22 `useState`) concentra navegación, modales y estado, y lo baja por props
  (`ChatView` recibe ~19). Archivos que mezclan varias pantallas: `ServerSettings` (2607), `UserSettings`
  (1647), `MobileShell` (1674). Componentes en una carpeta plana; la mobile ya está organizada por dominio.

### Objetivo

Unificar al 100% la **lógica** y el **sistema de diseño**; la interfaz se implementa por plataforma, pero con
**el mismo catálogo de componentes (mismos nombres y props)**.

```
Discordia-WebApp/
├── packages/
│   ├── core/      API, tipos, errores, React Query, chat por WebSocket, presencia, lógica de voz, contrato de auth
│   └── tokens/    colores, degradés, tipografía, espaciado, duraciones → CSS vars (web) y objeto (React Native)
├── apps/
│   ├── web/       React DOM + CSS Modules + motion
│   └── mobile/    Expo / React Native
```

Descartado: **React Native Web** (un solo código de interfaz). Obliga a reescribir las ~24 mil líneas de la
web, y los efectos del rediseño (texto gigante recortado, degradés animados, transiciones entre vistas) son más
difíciles fuera del DOM. No llega para la entrega del 04/12.

### Catálogo de componentes compartido

Misma API en `apps/web` y `apps/mobile`; cada uno con su implementación:

| Componente | Props principales |
|---|---|
| `Logo` | `size` |
| `DisplayText` | `children`, `active`, `variant: "nav" \| "watermark"` |
| `SectionLabel` | `children`, `collapsible`, `open`, `onToggle` |
| `UnderlineInput` | `label`, `required`, `hint`, `error`, `secret`, `size: "default" \| "large"` |
| `ActionLink` | `children`, `onPress` (se muestra como `_texto`) |
| `BlockButton` | `children`, `tone: "default" \| "danger"`, `size: "default" \| "large"`, `loading` |
| `Tabs` | `items`, `value`, `onChange` (subrayado deslizable) |
| `SquareAvatar` | `user`, `size`, `status` |
| `ServerStrip` | `server`, `active`, `unread` |
| `Toast` / `EmptyState` / `Skeleton` | `message`, `action` / `title`, `hint` / `lines` |

## 7. Pasos

### Paso 0: decisiones

- [x] Tipografía: Schibsted Grotesk.
- [x] Referencias: logo y portadas en `svg/`.
- [x] Pantallas faltantes: derivadas del sistema (sección 3).
- [x] Modo oscuro: sí, derivado de la intro; sale después del claro (sección 1).
- [x] App mobile: se rediseña (sección 5).
- [x] Contraste: gris oscurecido (sección 1).
- [x] `svg/` (~30 MB, imágenes embebidas) queda fuera del repo (`.gitignore` y `.dockerignore`). El logo
      está en `apps/web/src/assets/logo.svg` (`currentColor`) y las pantallas del PDF en `docs/design/` (JPEG,
      ~800 KB en total).

### Paso 1: reestructuración (sección 6)

Va antes que todo lo visual: mueve archivos, y hacerlo después obligaría a tocar cada archivo dos veces.
Cada sub-paso es un PR que no cambia el comportamiento: la app se ve y funciona igual y los tests pasan.

#### 1.1 Monorepo

- [x] npm workspaces en la raíz de `Discordia-WebApp`: `apps/web` (lo que estaba en la raíz),
      `apps/mobile` (antes `discordia-mobile/`), `packages/core`, `packages/tokens` (vacíos por ahora).
      Un solo `package-lock.json`; `.npmrc` (`legacy-peer-deps`) en la raíz.
- [x] Vite: el build sale a `dist/` de la raíz. Metro: sin `watchFolders` propio (Expo detecta el monorepo
      solo, según su guía de monorepos). Vitest sin cambios.
- [x] Cloudflare Pages y orquestador **sin cambios**: el `npm run build` de la raíz deja la web en `dist/`, y
      `Dockerfile` / `Dockerfile.dev` siguen en la raíz (instalan solo las dependencias de la web).
- [x] EAS: `apps/mobile/eas.json` y `app.json` se movieron con la app (mismo `projectId`). Se borraron el
      `app.json` / `eas.json` viejos de la raíz (otro `projectId`, paquete `discordiawebapp`, sin uso).
- [x] Borrar `shared-api/` (vacío). El alias `@shared` queda apuntando a `apps/web/src` hasta 1.2.
- [x] React 19.3.0 y TypeScript 6.0.3 en la web, iguales a mobile: una sola copia en el monorepo.
- [x] `tsconfig.base.json` en la raíz, que extienden la web y `packages/core`. Mobile sigue con la base de Expo.
- [x] ESLint: una sola config para todo el monorepo (`eslint.config.mjs`, ESLint 10 + typescript-eslint +
      react-hooks v7), se corre desde la raíz con `npm run lint` y el CI falla con errores, no con avisos.
- [ ] Revisar los avisos de lint (113 al 31/10: 87 `react-hooks/refs`, 19 `set-state-in-effect`, 5
      `exhaustive-deps`, 1 `purity`, 1 `preserve-manual-memoization`). La mayoría de `refs` es el patrón
      "ref con el último valor" (`ref.current = x` en el render), en ChatView, ServerSettingsScreen y los hooks
      de voz de core. Cuando queden en 0, pasar esas reglas de `warn` a `error`.
- [ ] Probar un build de EAS (`preview`) y un deploy de Pages desde esta rama antes de mergear a `main`.

#### 1.2 `packages/core`: lógica única

- [x] Mover `api/*` (cliente, servers, channels, roles, moderation, voice, users, messages, errors,
      channelLayout, passwordReset) a `packages/core/src/api`, con sus tests.
- [x] Tipos de dominio y DTO en `packages/core/src/types.ts`. La web conserva en `src/types.ts` solo los de
      interfaz (vistas, modales) y re-exporta los de core; mobile dejó de copiar los DTO.
- [ ] Modelos de interfaz de mobile (`User`, `Server`, `Role`, `Message`, ...): todavía difieren de los de
      core (`avatar: string | null`, permisos como `Record<string, boolean>`, `members: string[]`). Se unifican
      al reescribir las pantallas de mobile (paso 13).
- [x] Hooks de React Query (`packages/core/src/hooks/useApi.ts`) compartidos; esperan a que la sesión de core
      esté autenticada. Mobile dejó sus copias (moderación, miembros); solo conserva en `hooks/useRoles.ts` los
      que traducen los permisos al bitmask de su UI, con clave de caché propia (`['roles', id, 'bitmask']`).
- [x] **Una sola** lógica de chat en tiempo real: `realtime/chatSocket.ts` (reconexión con backoff, token
      nuevo en cada intento, `last_message_id_seen` para recuperar lo perdido), `useChatSocket` (mobile, con
      callbacks) y `useChatWebSocket` (web, sobre el caché de React Query). Reemplaza `useChatWebSocket` y
      `useChannelSocket`. El heartbeat lo hace el servidor con pings de protocolo, que el cliente responde
      solo: no hace falta código del lado del cliente.
- [x] Presencia de voz (`useVoicePresence`) y perfiles de usuario (`useUserProfiles`, que en mobile ahora usa
      `getUsersBulk`) unificados.
- [x] Sala de voz: estado y reglas en `core` (`useVoiceRoom`); lo de cada plataforma en `VoicePlatform`
      (web: `apps/web/src/platform/voice.ts`; mobile: `apps/mobile/src/utils/voice.ts`).
- [x] Contrato de auth (`AuthAdapter`) y sesión única en core (`useSession`, arranque, login, registro,
      alta automática del perfil, logout). Adaptadores: web (Auth0 SPA, `apps/web/src/auth/auth0.ts`) y
      mobile (token en memoria, `apps/mobile/src/api/auth.ts`). La Authentication API de Auth0 (login con
      contraseña y registro) está una sola vez, en `core/auth/auth0.ts`.
- [x] Reemplazar el alias `@shared` de mobile por imports de `@discordia/core` (alias borrado del
      `tsconfig` de mobile).
- [x] Core no depende de los datos de prueba: expone `setApiMock()` y la web registra sus respuestas
      simuladas solo con `VITE_USE_MOCK` en desarrollo.
- [x] Datos de prueba de la web a `@discordia/core/testing` (subpath aparte: no entra al bundle de producción).
- [ ] Datos de prueba de mobile (`apps/mobile/src/data/mock.ts`): están en los modelos de interfaz de mobile
      y son contenido de pantallas sin backend (DMs, notificaciones). Se mueven al unificar esos modelos
      (paso 13).
- [x] La configuración entra por core, sin `import.meta.env` / `process.env` adentro del paquete:
      `configureClient()` (API y WebSocket, `wsBaseUrl`) y `configureAuth()` (Auth0). La web no usa
      `VITE_WS_URL` (el WebSocket se deriva de `VITE_API_URL` y pasa por Kong); se sacó del Dockerfile, de
      los tipos y de las configs de Playwright.

#### 1.3 `packages/tokens`

- [x] Tokens en TypeScript (`packages/tokens/src`): colores claro/oscuro (`colors.ts`), degradés de la app, de
      auth y de la intro (`gradients.ts`, con la geometría de `gradiente 1/2.svg`), tipografía en tres escalas
      (`typography.ts`), espaciado de 4 px, líneas, radio 0 y medidas de la grilla (`layout.ts`), duraciones,
      curvas y desplazamientos (`motion.ts`).
- [x] Salida para web: `packages/tokens/tokens.css` (`@discordia/tokens/tokens.css`), versionado y generado
      con `npm run build:css -w @discordia/tokens`; un test falla si quedó desactualizado. Todo bajo
      `:root[data-ui="nuevo"]`; oscuro con `[data-theme="dark"]` o `[data-theme="system"]`; con
      `prefers-reduced-motion`, fundidos de 150 ms sin desplazamientos ni intro. Los textos gigantes escalan con
      `clamp()` entre su mínimo y su tamaño del PDF.
- [x] Salida para mobile: `nativeTheme(scheme)`, el objeto que reemplaza `src/theme/*` (el reemplazo en sí es
      del paso 13: hacerlo antes cambiaría la app mobile a medio rediseñar).
- [x] Contraste WCAG AA verificado por test en los dos temas (sección 1).
- Decisiones tomadas acá (no estaban en el PDF): metadatos a 11 px (en el PDF, 7–8 px); bloques invertidos en
  negro puro (`#000`, como el logo); el rojo de peligro (`#c0392b`) solo en bloques con texto blanco, nunca
  como texto chico sobre el cielo (da 3.9:1); degradé de auth radial desde arriba al centro
  (`backgroundGlow`, págs. 3–5).

#### 1.4 Web con la estructura de mobile

- [x] Carpetas por dominio en `apps/web/src`:
      - `features/{auth,servers,channels,chat,voice,friends,profile,settings,moderation,notifications}`: cada
        pantalla con su panel (lo conecta a stores y hooks) y sus componentes.
      - `ui/`: piezas sin dominio (`Avatar`, `ModalOverlay`, `ConfirmDialog`, `Toast`, `ConnectionBanner`);
        acá entra el catálogo del paso 3.
      - `app/`: armado de la app (`uiStore`, `UsersProvider`, `DesktopLayout`, `MobileLayout`,
        `GlobalModals`, `MobileShell` y sus pantallas en `app/mobile/`).
      - `platform/`: integraciones del navegador (adaptador de Auth0, voz con `<audio>`, mock de la API).
- [x] Partir `App.tsx` (de 1063 a 75 líneas):
      - `useUIStore` (zustand) para navegación, modales, confirmaciones y toasts.
      - `useCurrentUserStore` y `useDmStore` para el usuario propio y los DMs locales.
      - React Query para los datos del servidor (`useCurrentServer`).
      - Providers para lo que vive toda la sesión: `VoiceProvider` (sala y presencia),
        `ChatConnectionProvider` (WebSocket del canal) y `UsersProvider` (perfiles).
      - `App` ya no le pasa props a nadie: cada panel (`ChatPanel`, `ChannelSidebarPanel`, `HomePanel`, ...)
        arma su componente desde los stores; los componentes de presentación siguen recibiendo props, que es
        lo que facilita el rediseño.
- [x] Partir `ServerSettings` (2607 → 340 líneas + 8 pestañas), `UserSettings` (1647 → 355 + 7) y
      `OwnProfileView` (1021 → 61 + 3 secciones: barra, tarjeta y formulario; no tiene pestañas). El estado
      sigue en el componente (hook `use*State`) y cada pestaña toma lo que usa: cambiar de pestaña no pierde lo
      que se estaba editando.
- [x] Partir `MobileShell` (1674 → 81 líneas) en pantallas (`app/mobile/MobileChatScreen`, `MobileVoiceScreen`,
      `MobileHomeScreen`) y hojas (`ServerSheet`, `ProfileSheet`, `MemberSheet`). Reusar los componentes de
      `features/` en mobile queda para el paso 11, junto con su rediseño: hoy son interfaces distintas.
- [x] Prueba de humo de la app completa (`apps/web/src/__tests__/App.smoke.test.tsx`): arranca autenticada
      contra un backend falso y recorre inicio, servidor, chat (envío por WebSocket), presencia de voz, ajustes de
      usuario y de servidor (todas las pestañas), perfil, modales y el shell mobile (pantallas y hojas). Es la red
      de seguridad para los pasos 2 a 11.
- Bug encontrado por la prueba de humo y corregido: el shell mobile se rompía (pantalla en blanco) mientras
  cargaban los servidores o si el usuario no tenía ninguno (`servers[0].categories`).
- Cambio de comportamiento menor: la sala de voz se cierra al cerrar sesión (antes quedaba conectada, porque
  `App` seguía montado).

### Paso 2: ordenar los estilos (sin cambio visual)

- [x] Estilos en línea a **CSS Modules**: 54 módulos (`Componente.module.css`, al lado de cada componente), 5262
      declaraciones movidas. De 1406 `style={{...}}` quedan 365, con lo que no se puede mover sin cambiar cómo
      se ve:
      - valores que dependen del estado (y las propiedades relacionadas: si `border` es dinámico,
        `borderColor` queda en línea para que siga ganando el mismo);
      - elementos que también tienen una clase global de `index.css` (la clase de módulo competiría por orden
        con sus `:hover`, cuando antes el estilo en línea siempre ganaba);
      - elementos que cambian su propio `style` en eventos (`e.currentTarget.style...`);
      - props `style` de componentes (`<Avatar style>`).
      Los objetos de estilo en constantes (`style={inputStyle}`, 48 usos, sobre todo en `AuthView`) tampoco se
      movieron: `AuthView` se reescribe entera en el paso 4.
- [x] Colores hex de los estilos a variables: de 802 quedan 143. 22 colores ya tenían variable en `index.css`
      (mismo valor); los 16 restantes tienen una nueva en la sección "paleta heredada" (`--legacy-*`). Los que
      quedan en hex son: fallbacks dentro de `var(--x, #hex)`, colores de íconos (`<Icon color="#...">`, que
      terminan en el atributo `stroke` del SVG, donde `var()` no funciona), datos (colores elegibles de rol y
      de banner, que se guardan en el backend) y mapas de constantes (paleta de avatares, colores de estado),
      que se reemplazan con los componentes del paso 3.
- [x] Verificado sin cambio visual: 44 capturas (escritorio y mobile: login, inicio, servidor, chat, voz,
      menú del servidor, modales, perfil y todas las pestañas de ajustes) en Chrome contra un backend falso,
      con la hora fija y sin animaciones, comparadas píxel a píxel antes y después: idénticas. También se
      revisaron las reglas globales que podían ganarle a una clase de módulo (`.server-item img`,
      `.message-attachment img`, `.message-divider span`, `.switch input`, `a:hover`): ninguna choca con lo
      movido.
- Hecho en un solo cambio (con un codemod sobre el compilador de TypeScript), no en PRs por componente: el
  orden por componentes tenía sentido a mano; automatizado y verificado con capturas, partirlo solo agregaba
  pasos. Los nombres de clase salen del comentario que precede al elemento, de su `aria-label` / `title` /
  `placeholder`, de su texto o del ancestro con nombre más cercano (`roleHeader`, `roleHeaderH3`); 79 de 980
  quedaron genéricos (`div3`).

### Paso 3: sistema de diseño

- [x] `@discordia/tokens/tokens.css` importado en la web (`main.tsx`), más una base mínima (`ui/base.css`:
      degradé de fondo en `<html>`, tipografía y foco visible). Todo bajo `[data-ui="nuevo"]`: con el flag
      apagado la app se ve igual (44 capturas comparadas píxel a píxel).
- [x] Schibsted Grotesk servida desde el bundle (`@fontsource/schibsted-grotesk`, pesos 400, 700 y 900, los de
      la escala), sin pedidos a Google Fonts. El navegador la baja solo cuando algo la usa.
- [x] Flag en desarrollo (`ui/flag.ts`): `?ui=nuevo` / `?ui=viejo` y `?tema=oscuro|claro|sistema`, recordados en
      `localStorage`. En producción no se activa.
- [x] Catálogo en `ui/` (exportado por `ui/index.ts`), con los nombres y props de la sección 6: `Logo`,
      `DisplayText` (nav y marca de agua cortada, con barrido al cambiar de contexto), `SectionLabel` (`X /`
      cruzado por la línea, colapsable), `UnderlineInput` (ojo para mostrar / ocultar la contraseña, error con barra inicial),
      `ActionLink` (`_editar`), `BlockButton` (bloque invertido, `danger`, `loading`), `Tabs` (subrayado que se
      desliza; flechas, Inicio y Fin), `SquareAvatar` (iniciales si no hay foto o no carga), `ServerStrip`
      (etiqueta negra al pasar el mouse o con foco), `Toast`, `EmptyState`, `Skeleton` y `HairlineGrid`. Las
      piezas del diseño anterior pasaron a `ui/legacy/` (se borran en el paso 14).
- [x] `motion` 13 + `useMotionPreset(fade | rise | sweep | curtain)` (`ui/motion.ts`), con duraciones y curvas
      de los tokens, solo `transform` y `opacity`; con `prefers-reduced-motion`, todo es un fundido de 150 ms.
      En CSS, las transiciones usan `--motion-duration-*`, que los tokens ya acortan.
- [x] Página de catálogo para revisar los componentes: `/?catalogo` (y `&tema=oscuro`), solo en desarrollo; no
      llega al build de producción.
- [x] Tests de los componentes (comportamiento y accesibilidad), del flag y del movimiento reducido
      (`ui/__tests__`).
- [ ] Revisar con diseño: en los pesos 700 y 900 de Schibsted Grotesk la "I" mayúscula tiene remates (se ve en
      la marca de agua y en las iniciales); en el PDF no. Si molesta: otro peso para la marca de agua o una
      alternativa de glifo, si la fuente la trae.

### Paso 4: Auth (`AuthView`)

- [x] Lógica de los formularios en `features/auth/useAuthForms.ts` (validaciones, mensajes, envío y a qué campo
      corresponde cada error), compartida por la vista nueva (`AuthScreen`) y la anterior
      (`legacy/LegacyAuthView`, se borra en el paso 14). `AuthView` elige según el flag.
- [x] Intro "amanecer" (`DawnIntro`, montada en `App` encima de todo mientras arranca la sesión): noche →
      el resplandor sube (gradiente 1 → 2) con la "D" que aparece y se pierde → degradé del login, ~4 s (`durations.intro`; con 1.8 s no se llegaba a ver).
      Se saltea con clic o tecla, sale solo la primera vez en el navegador (`localStorage`) y se omite con
      movimiento reducido.
- [x] Login / registro: las palabras gigantes navegan; al activarse, las letras suben una tras otra
      mientras se oscurecen (`DisplayText`, sirve también para el menú de ajustes del paso 9). El formulario
      entra con un fundido; campos subrayados con un ojo para mostrar / ocultar la contraseña; botón
      principal en bloque negro y las acciones secundarias en mayúsculas sin fondo (`VOLVER`,
      `USAR OTRA CUENTA`). El resplandor del fondo deriva despacio (60 s).
- [x] Acceso en tamaño grande (`size="large"` en `UnderlineInput` y `BlockButton`): columna de 480 px,
      etiquetas de 15 px, texto de los campos de 18 px y textos de apoyo de 13 px. Con el tamaño del PDF
      (campos de 11–13 px en una columna de 330 px) el formulario ocupaba muy poco de la pantalla.
- [x] Sin pantalla de "VERIFICANDO SESIÓN" (estaba en el PDF; se sacó porque al recargar el login
      aparecía de pasada). Mientras la sesión arranca se muestra lo que probablemente venga, según
      `hasStoredSession()` (sesión guardada vigente o vuelta de Auth0 en `/callback`): el login, que ya
      entra animado y se puede completar pero no enviar hasta que la sesión resuelve, o solo el fondo
      hasta que aparece la app.
- [x] Entrada escalonada: los elementos del formulario suben uno tras otro (también al cambiar de
      vista) y después las palabras del pie. Con movimiento reducido, solo un fundido.
- [x] Errores en línea bajo cada campo, con barra inicial, `aria-invalid` y el foco en el campo. Los que no
      son de un campo (credenciales incorrectas, servidor) van sobre el botón con `role="alert"`; el login
      no dice qué campo falló (CA 2/3).
- [x] Resto de los estados en el mismo sistema: recuperar contraseña, verificá tu email, cuenta suspendida,
      error con `Reintentar` y elección de usuario (`needs_profile`).
- [x] Tests: los criterios de aceptación de `AuthView.test.tsx` corren contra las dos vistas; los propios
      del rediseño y de la intro, en `AuthScreen.test.tsx`.
- Placeholders: se mantuvieron los de la vista anterior (`ejemplo@discordia.com`, `ej: alexr`) en lugar
  de los del PDF, para que los mismos tests cubran las dos vistas hasta el corte.

### Paso 5: estructura (`App`, `ServerRail`, `UserPanel`)

- [x] Layout en grilla con líneas y degradé de fondo animado: `app/AppShell` (rail | barra lateral |
      contenido), que `DesktopLayout` usa con el flag. El degradé deriva 60 s (solo `transform`; quieto con
      movimiento reducido). `overflow: clip` y no `hidden`: con `hidden` el `scrollIntoView` del chat corría la
      grilla.
- [x] Rail (`features/servers/ServerRail`, el anterior en `legacy/`): logo, franjas de imagen
      (`ServerStrip`), y al pie inicio, crear y explorar con íconos de línea fina. La etiqueta negra se
      despliega corriéndose desde la franja, con `position: fixed` (el rail scrollea y la recortaría); en
      las acciones es CSS. Activo: la franja se corre (servidores) o una barra a la izquierda (inicio).
      Actividad nueva: marca en la franja y "N mensajes nuevos" en la etiqueta.
- [x] Barra de usuario (`features/profile/UserBar`): avatar cuadrado, nombre, estado con barra final
      (`Invisible/`, `Conectado/`, el estado personalizado o `En canal de voz/`), micrófono, audio, colgar
      (en llamada) y ajustes, separados por líneas. El nombre abre el mini perfil y el selector de estado
      (todavía los del diseño anterior; se rediseñan en el paso 10). Toma el tono de la marca de agua para
      fundirse con ella: negra en el inicio, sobre el tinte celeste en un servidor, gris en una llamada.
- [x] Marca de agua del contexto al pie de la barra lateral: `AMIGOS` (o el nombre del otro usuario en un
      DM), el nombre del servidor en celeste, en gris mientras se mira una llamada; barrido al cambiar.
      Se lee entera (cambio respecto del PDF, donde queda cortada a lo ancho y por abajo): se ajusta al
      ancho de la columna midiendo con canvas, hasta su tamaño del token; si un nombre largo quedaría por
      debajo de 48 px, parte en renglones por palabra. La caja se recorta a la altura de las mayúsculas
      (`text-box: trim-both cap alphabetic`) para que las letras se apoyen en la barra de usuario.
- [x] Prueba de humo de la app corriendo también con el rediseño (y el store de la interfaz se reinicia
      entre tests: antes cada test arrancaba donde dejó el anterior). Tests de `ServerRail` y `UserBar`.
- Transitorio hasta los pasos 6 y 7: el contenido de la barra lateral (canales, mensajes directos) y de la
  columna principal es el del diseño anterior, montado dentro de la grilla nueva: `ChannelSidebar` sin su
  barra de usuario (`showUserPanel={false}`) y la lista de DMs de `HomeView` por portal en la barra lateral.
- No se hicieron los íconos de arriba a la derecha del PDF (bandeja y ayuda): no hay bandeja de entrada
  ni ayuda en la app (`NotificationCenter` existe pero no está montado en ningún lado).

### Paso 6: Home y amigos (`HomeView`)

- [x] Lógica del inicio en `features/friends/useHomeState.ts` (pestañas, búsquedas, solicitudes, bloqueados,
      DM activo), compartida por la vista nueva (`HomeView`) y la anterior (`legacy/LegacyHomeView`).
      `HomePanel` elige: dentro de `AppShell` la nueva; si no, la anterior con su barra de usuario.
- [x] Tres columnas con las mismas filas de 48 px, así las líneas quedan alineadas (PDF, pág. 6):
      - Barra lateral: buscador entre líneas, `MENSAJES DIRECTOS /` con `+` (lleva a añadir amigo) y las
        conversaciones sin avatar: nombre, estado con barra final (`Conectado/`; en gris si está
        desconectada) y los no leídos. La abierta lleva una barra negra a la izquierda.
      - Amigos: `AMIGOS` en su celda y las pestañas (`DISPONIBLE (0)`, `TODOS`, `PENDIENTE`, `BLOQUEADO`,
        `AÑADIR AMIGO`) apoyadas en la línea, con el subrayado que se desliza; buscador; filas con avatar
        cuadrado y presencia, `@usuario · estado/` y acciones `_mensaje`, `_llamar`, `_perfil`
        (`_desbloquear`, `_aceptar` / `_rechazar` en sus pestañas). Añadir amigo con campo subrayado y
        bloque negro.
      - `ACTIVO AHORA` con su estado vacío.
- [x] Estados vacíos propios de cada pestaña y de las búsquedas (`sin resultados`); desde `todos` vacío,
      `_añadir amigo`. Al cambiar de pestaña el contenido entra escalonado.
- [x] `Tabs`: reserva el ancho de la pestaña en negrita, así las demás no se corren al cambiar.
- [x] Chat de DMs (sección 3): hecho en el paso 7 con el chat de canal (mismo `ChatView`); el encabezado
      tiene `perfil`, `llamar`, `videollamada` y `mensajes fijados`.
- Sin backend de amigos todavía: la lista de amigos sale vacía y las solicitudes y bloqueos son locales
  (igual que en la vista anterior).

### Paso 7: servidor y chat (`ChannelSidebar`, `ChatView`, `MemberList`)

- Mismo patrón que antes: la lógica en hooks compartidos (`chat/useChatViewState`,
  `channels/useChannelDragAndDrop`), las vistas anteriores en `legacy/` y los paneles eligen con el flag.
- [x] Barra de canales (`channels/ChannelSidebar`): `Invitar al servidor +` y `menú v` (panel de línea
      fina que baja, con todas las acciones del servidor; abandonar / eliminar separado), categorías con
      `SectionLabel` colapsable (los canales bajan escalonados al abrir), canales `•nombre` (el activo en
      negrita con barra negra, no leídos con el número en bloque negro, `_editar` al pasar el mouse),
      participantes de voz con avatar cuadrado (el que habla, con un contorno que pulsa). El reorden por
      arrastre se mantiene (línea de 2 px donde va a quedar). El nombre del servidor no va arriba: es la
      marca de agua.
- [x] Mensajes (`chat/ChatView`): avatar cuadrado, autor en negrita y fecha chica (`20/10/25, 13:25`,
      24 h), texto grande; separadores por día (`hoy`, `ayer`, `21 de octubre de 2025`); agrupados por
      autor (la hora aparece en el margen al pasar el mouse); respuestas con línea fina y cita chica;
      reacciones en cajas de línea fina (la propia, invertida); imágenes sin borde y archivos con
      `_descargar`; menciones subrayadas; acciones al pasar el mouse (`_reaccionar`, `_responder`,
      `_editar`, `_más`). Solo los mensajes nuevos entran subiendo (el historial no se anima).
- [x] Encabezado de 48 px con enlaces de texto separados por líneas (`silenciar notificaciones`,
      `mensajes fijados (n)`, `mostrar / ocultar lista de miembros`); barra de escritura de una línea
      con adjuntar, emojis y `ENVIAR /`; carga con esqueleto.
- [x] Miembros (`servers/MemberList`): columna como `ACTIVO AHORA`, grupos con `SectionLabel`, avatar
      cuadrado con presencia, el color del rol en un cuadrado chico (nunca como color de texto).
- [x] Reconexión y recuperación: no cambian (`ChatConnectionProvider` y el caché de React Query; el chat
      solo cambió de vista). La prueba de humo del envío por WebSocket corre con los dos diseños.
- [ ] Paginación: la web no la tiene (`useChannelMessagesQuery` pide una sola página de 50 y no hay
      "cargar anteriores"), ni antes ni ahora. Queda pendiente aparte: `getMessages` ya acepta `before`.
- No se hicieron `hilos` ni el buscador del encabezado del PDF: no existen en la app (el buscador del
  diseño anterior no hacía nada).
- Corregido de paso: al responder a un mensaje sin el objeto `author` (lo normal desde el backend), la
  barra decía "@usuario" en vez del nombre.
- Corregido después: la línea de `SectionLabel` (categorías, grupos de miembros) tachaba el título, porque
  iba a una altura fija en `em` que dependía del interlineado. Primero se apoyó en la línea base, pero
  igual tapaba el pie de las letras: la línea quedó debajo del título, de borde a borde y separada por
  4 px (cambio respecto del PDF, donde cruza el texto). La `v` de colapsar quedó junto al título (antes,
  a 24 px).
- Resuelto en el paso 12: en oscuro, el tinte celeste de la barra lateral del servidor quedaba gris azulado.

### Paso 8: voz (`VoiceView`)

- [x] Mosaico a sangre (`voice/VoiceView`, el anterior en `legacy/`): fichas separadas por líneas finas,
      la foto llenando la ficha (o las iniciales en grande) y el nombre en la etiqueta negra al pie, con el
      micrófono silenciado y "silenciado para vos". Las fichas se reacomodan animadas al entrar o salir
      alguien (`layout` de motion, solo transform); quien habla tiene un borde grueso que pulsa. Columnas
      según la cantidad (1, 2, 3 o 4). Estado de la conexión en el encabezado (`conectado/`,
      `reconectando/` latiendo). Click derecho en toda la ficha para silenciar solo para mí.
- [x] Última ficha con `Invitar a la llamada +` (abre la invitación al servidor) y `Elegir actividad`
      (deshabilitado, `próximamente`: no hay actividades).
- [x] Controles en la barra lateral (`voice/VoiceControls`), entre la marca de agua y la barra de usuario,
      con su mismo tono: en qué canal estás (lleva de vuelta a la llamada desde otro canal o el inicio),
      el estado, cámara y pantalla (deshabilitadas: la voz es solo audio) y colgar. Se ven en toda la app
      mientras dura la llamada. Micrófono y audio quedan en la barra de usuario; colgar salió de ahí.
- [x] Tests del clic derecho corriendo con las dos vistas; tests del mosaico y de los controles.

### Paso 9: ajustes (`UserSettings`, `ServerSettings`, `OwnProfileView`)

- [x] Partir los archivos por pestaña: hecho en el paso 1.4.
- [x] 9a. Marco compartido `settings/SettingsScreen` (PDF, pág. 11): identidad, buscador (filtra el menú
      por la palabra o por lo que hay adentro de cada sección) e índice de la sección arriba a la
      izquierda; menú de palabras gigantes abajo (la activa con una barra); celdas en grilla de líneas
      finas que bajan escalonadas; `×` y Escape. Piezas: `SettingsCell`, `SettingsRow`, `Choice`
      (opciones en una fila, la elegida en bloque negro), `Switch` (cuadrado) y `Feedback`. Entra bajando
      como cortina y sale subiendo: se monta encima de la grilla (que sigue montada, así no se pierde el
      chat ni la llamada) con `AnimatePresence` en `DesktopLayout`.
- [x] 9a. Ajustes de usuario (`settings/user/UserSettingsScreen`, mismo estado que la vista anterior):
      `CUENTA` (información, estado, contraseña y seguridad, dos factores), `NOTIFICACIÓN`, `VOZ`,
      `FACTURA` (premium y puntos), `EXPERIENCIA` y `CERRAR SESIÓN` (con confirmación). Los mensajes del
      estado compartido pasaron al castellano.
- [x] 9a. Selector de tema en *Experiencia* (Claro / Oscuro / Sistema): es el tema real de la app
      (`setThemePreference` en `ui/flag.ts`: `data-theme` en `<html>` y `localStorage`). El modo de los
      mensajes y el tamaño de letra siguen siendo locales, como antes.
- [x] 9b. Ajustes del servidor (`settings/server/ServerSettingsScreen`, mismo estado que la vista anterior):
      `RESUMEN` (ícono, nombre, descripción y números), `ROLES` (crear con color, lista, editar nombre y
      color, por defecto, eliminar, miembros del rol, permisos con interruptores agrupados y la barra
      negra de cambios sin guardar), `MIEMBROS` (paginados al bajar, roles como etiquetas con ×, `_rol +`,
      `_banear` con motivo y bloque rojo), `BANEOS` (revocar con confirmación en la fila; sin permiso, un
      vacío que lo explica), `CANALES`, `MODERACIÓN` (filtros, palabras bloqueadas, registro de
      auditoría vacío), `NOTIFICACIÓN`, `EMOJIS` y `MEJORAS`; acciones `INVITAR` y `ELIMINAR` (dueña) o
      `ABANDONAR`, que abren el modal y la confirmación de siempre. La lógica de miembros y baneos pasó a
      `moderation/useServerMembersAdmin` y `useServerBansAdmin` (compartida con las pestañas
      anteriores). No hay `INVITACIONES` como sección: la app no lista invitaciones, solo las crea.
- [x] 9c. `CANALES` contra el backend: crear canal (texto o voz, con categoría o sin ella) y categoría,
      borrar canal y categoría, con los hooks de core que ya usaba la barra lateral y sus mismos mensajes
      de error. La lista sale del servidor de las props, que se actualiza cuando el backend confirma.
- [x] 9c. `MIEMBROS`: `_silenciar` (15 minutos, 1 hora, 24 horas o hasta quitarlo, con motivo) y
      `_expulsar` (con motivo, bloque rojo), contra `POST /servers/{id}/mutes` y
      `DELETE /servers/{id}/members/{usuario}`. En core: `kickMember`, `muteMember`, `unmuteMember`, sus
      mensajes de error y `useKickMemberMutation`, `useMuteMemberMutation`, `useUnmuteMemberMutation`. El
      backend no dice quién está silenciado, así que el panel ofrece siempre `_quitar silencio`.
- [x] 9c. Nada simula guardarse: lo que el backend todavía no guarda queda deshabilitado con
      `próximamente` y "/ Todavía no se guarda en el servidor." (`SettingsCell soon` y `SoonFieldset`: un
      fieldset deshabilitado). Servidor: identidad (no hay `PATCH /servers/{id}`), moderación,
      notificaciones, emojis y mejoras. Usuario: contraseña, dos factores, notificaciones, voz, factura,
      modo de los mensajes y tamaño de letra. Perfil: banner. La presencia (conectado, ausente...) queda
      habilitada con la aclaración de que vale solo para la sesión. Se sacaron los "guardado/" que
      aparecían antes de que respondiera el backend: el aviso de la app ya lo confirma.
- Pendiente de backend para habilitarlas: `PATCH /servers/{id}`, moderación automática, preferencias de
  notificaciones, emojis, mejoras y puntos (Payments), banner y presencia en el perfil, cambio de
  contraseña y 2FA.
- [x] 9b. Perfil propio (`profile/own-profile/OwnProfileScreen`) en el mismo marco: vista previa en vivo
      (banner como franja, avatar cuadrado encima) y edición de avatar, banner, nombre (validado), bio y
      estado. El avatar se sube como archivo a `PATCH /profile/avatar` al guardar (Auth lo guarda en S3) y la
      interfaz toma la URL que devuelve; `PATCH /profile` ya no manda `avatar_url`.
- [x] Los tres bajan como cortina encima de la grilla. Los modales y avisos se movieron fuera de la grilla
      (que aísla su apilado) para quedar arriba de los ajustes; Escape cierra primero el modal de arriba.
- [x] Textos al castellano: permisos (`server/shared.ts`) y mensajes del estado del servidor.

### Paso 10: modales, toasts y conexión

- Mismo patrón que antes: los modales anteriores pasaron a `legacy/` (`LegacyCreateServerModal`, ...) y
  `GlobalModals` monta unos u otros según el flag, con los mismos handlers. La lógica que comparten está
  en `servers/serverActions` (`useJoinServer`, `useInvitePreview`) y `channels/channelErrors`.
- [x] Catálogo (`ui/`): `Modal` (panel a todo el ancho que baja como cortina, ~60% del alto, con el título
      en display en la columna de rail + barra lateral y el contenido a la derecha; ×, Escape y tocar afuera
      lo cierran; el foco queda adentro y vuelve al cerrar), `ModalForm` y `ModalActions` (`_cancelar` y
      el bloque al pie), `ConfirmDialog`, `Choice` (pasó de los ajustes al catálogo; si la fila no entra, se
      parte en una grilla limpia) y `ConnectionBanner`. Preset de movimiento `toast` (entra desde abajo).
- [x] Modales del rediseño: crear servidor (nombre e ícono opcional, que se manda como archivo y Server-Roles
      guarda en S3), unirse (vista previa como franja; si la invitación no sirve, el error queda en el
      campo y el modal sigue abierto), invitar (vencimiento y usos con `Choice`), crear / editar canal (tipo y
      categoría con `Choice`; eliminar confirma adentro del mismo modal, sin `window.confirm`), crear
      categoría y perfil de otro usuario.
- [x] Confirmaciones (`¿ELIMINAR CANAL?`, `¿ABANDONAR SERVIDOR?`, ...): texto chico al pie, `_cancelar` y
      el bloque, rojo solo en las destructivas; eliminar un servidor pide escribir su nombre. El botón queda
      cargando mientras se confirma.
- [x] Avisos (`app/ToastHost`): tira negra del ancho de la columna central, apoyada sobre la fila de
      escritura, que entra desde abajo y se va a los 4 s (`durations.toast`; antes 3 s fijos). Cada aviso
      tiene su id: el timer de uno anterior ya no cierra al que lo reemplazó. Los errores llevan el borde rojo
      y, donde sirve, `_reintentar` (mensaje que no se envió, entrar a un canal de voz; con una acción duran
      el doble).
- [x] Conexión: línea de 2 px arriba de toda la app mientras reconecta y `reconectando/` en la barra de
      usuario. Junta tres fuentes (`app/useConnectionStatus`): la red del navegador, el chat del canal (core
      distingue ahora `reconnecting` de `connecting`: un corte después de haber estado abierto) y la llamada.
- [x] Menú de la barra de usuario (`profile/UserMenu`, reemplaza al mini perfil y al selector de estado
      anteriores, que pasaron a `legacy/`): presencia (solo para la sesión, con la aclaración), estado
      personalizado y atajos a editar perfil, ajustes y cerrar sesión.
- [x] Esqueletos de carga: las vistas nuevas ya los usaban (rail, canales, chat, ajustes); los spinners que
      quedan son de pestañas del diseño anterior.
- [x] Tests: catálogo (`ui/__tests__/Modal.test.tsx`), modales de servidores y canales, menú y estado de la
      barra de usuario, avisos del store, estado `reconnecting` del socket (core) y la prueba de humo (crear
      servidor con Escape, sin red, avisos).
- Se sacó lo que simulaba guardarse: en el perfil de otro usuario, la nota privada, bloquear, reportar y
  "servidores en común" (siempre vacío); el mensaje directo queda en "próximamente". En el menú de usuario,
  puntos y premium.
- Corregido de paso (también en el diseño anterior, que es el que ve producción):
  - Invitar mandaba 30 min, 1 h, 6 h y 12 h como "nunca vence" (solo mapeaba 1 y 7 días).
  - Invitar creaba una invitación nueva en cada cambio de opción. Ahora se genera al abrir y, si se cambian
    las opciones, se ofrece `_generar otro enlace` (las invitaciones todavía no se pueden listar ni revocar
    desde la app).
  - En mobile web, unirse a un servidor mostraba "Te has unido" sin llamar al backend.
  - El estado personalizado de la barra de usuario solo cambiaba en memoria: ahora se guarda en el perfil
    (el backend ya lo aceptaba).
- No se hicieron `GlobalSearch` ni `NotificationCenter`: no están montados (deuda 2.7 y 6.1). La llamada
  entrante sigue siendo la simulación de `App.tsx` (deuda 7.2); solo se pasó al sistema.
- Mobile web (`MobileLayout`) sigue con los modales del diseño anterior hasta el paso 11.

### Paso 11: mobile web (`MobileShell`)

- Hallazgo: el `MobileShell` anterior era una maqueta. Los canales salían del backend, pero el chat
  agregaba los mensajes a un estado local sin mandarlos por el WebSocket, la voz mostraba
  "RTC Conectado (64 kbps)" y un participante inventado sin entrar a LiveKit, y micrófono y audio eran
  estado propio. Por eso no se rediseñó: se armó otro shell sobre los paneles reales del escritorio.
- [x] `app/mobile/MobileAppShell` (con el flag; `MobileLayout` elige). Usa el mismo `useUIStore` y los
      mismos paneles que el escritorio (`ChannelSidebarPanel`, `ChatPanel`, `VoicePanel`,
      `MemberListPanel`, `HomePanel`), así el chat, la voz, los modales, los avisos, la reconexión y los
      ajustes son los reales. El shell solo agrega la pestaña y si hay un canal abierto.
- [x] Barra inferior con `Servidores`, `Mensajes`, `Avisos` y `Perfil` (la activa, en bloque invertido).
      "Notificaciones" pasó a "Avisos": en cuatro columnas de 390 px no entraba.
- [x] En Servidores, la tira de franjas arriba (`ServerStrip orientation="horizontal"`: la activa baja y no
      hay etiqueta flotante, que en táctil quedaba colgada), con crear y unirse. Siempre hay un servidor
      elegido: el último, o el primero. Al volver de Mensajes se retoma el último.
- [x] Encabezado gigante en cada pantalla: la marca de agua del escritorio, en tinta (acá es el título, con
      un `h1` para lectores de pantalla). Un nombre largo queda en un renglón más chico en lugar de partirse
      en tres (`--watermark-one-line-min`).
- [x] Canal, llamada, miembros y DM abren a pantalla completa con una fila de vuelta (`‹ Torton`). Durante
      una llamada, los controles y la barra de usuario del escritorio van sobre la barra inferior.
- [x] Mensajes: la lista de DMs y los amigos. Avisos: vacío con "próximamente" (no hay backend, deuda 6.1).
      Perfil: identidad, presencia, estado personalizado y atajos, con el mismo contenido que el menú de la
      barra de usuario (`UserMenuContent`).
- [x] Reglas de pantalla chica (`max-width: 767px`) en las vistas que se reusan: encabezado del chat que se
      desliza de costado, inicio en una columna sin ACTIVO AHORA, pestañas de amigos en una fila, miembros a
      todo el ancho, mosaico de voz de dos columnas como máximo, y ajustes y perfil propio con el menú como
      fila que se desliza y las celdas de a una. Los modales ya se adaptaban (paso 10).
- [x] Las vistas a pantalla completa (ajustes y perfil) pasaron a `app/FullScreenViews`, compartido por
      escritorio y mobile.
- [x] El shell anterior y sus pantallas, a `app/mobile/legacy/` (se borran en el paso 14).
- [x] Prueba de humo mobile con el rediseño: elige el servidor, abre el canal, envía por el WebSocket,
      miembros y vuelta, y las cuatro pestañas.
- Pendiente: probarlo en teléfonos reales (Safari iOS con la barra de direcciones, teclado abierto sobre la
  barra de escritura).

### Paso 12: modo oscuro

- [x] Revisión pantalla por pantalla en oscuro (acceso, inicio, chat, voz, menú de usuario, avisos, modales,
      confirmación, ajustes de servidor, perfil propio, reconexión y mobile), con capturas en Chrome. Los
      componentes del rediseño ya usaban solo tokens: no hubo colores fijos que cambiar (los que quedan son
      datos: banner, roles y presencia, y el negro de la intro, que es a propósito).
- [x] Líneas que marcan algo (`lineStrong`): de `#f2f2f0` a `#6b8794`. El blanco sobre la noche hacía de la
      grilla una reja; el celeste apagado da 4.95:1 y 4.25:1 sobre el degradé. Nuevo test: `lineStrong`
      tiene que llegar a 3:1 (componente no textual) en los dos temas.
- [x] Celeste de un servidor en tokens propios: `skyTint` (fondo de la barra lateral; en oscuro, un velo
      del 6% en lugar del bloque gris azulado que dejaba el 30%) y `skyDecoration` (marca de agua; en oscuro,
      `#2b4550`, tan sutil como el cielo de día). Antes salían los dos de `--color-glow`.
- [x] El estado de la llamada (`conectando/`, `reconectando/`) late solo mientras conecta. `desconectado/`
      latía y en el punto más bajo no se leía.
- [x] La vista previa del perfil propio sin banner guardado muestra la franja neutra del tema (antes, el azul
      de Discord por defecto del diseño anterior).
- [x] Sin elección guardada, el tema sigue al sistema (`prefers-color-scheme`). `?tema=` sigue teniendo
      prioridad aunque el storage esté bloqueado. El selector de *Experiencia* ya estaba (paso 9a).
- Para el paso 13: `nativeTheme()` ya trae `skyTint` y `skyDecoration` (salen de los mismos tokens).

### Paso 13: app mobile nativa

- Sin flag: la app mobile no se publica sola (el APK se arma a mano con EAS), así que cada pantalla se
  reemplaza en el lugar. Los componentes viejos que quedaron sin uso se borraron.
- [x] Tema: `src/theme/ThemeProvider` arma `nativeTheme()` claro y oscuro (`useTheme`, y `makeStyles` para
      estilos que dependen del tema, calculados una vez por tema). Sigue al sistema (`userInterfaceStyle:
      automatic`) o a la elección guardada en AsyncStorage. Schibsted Grotesk 400, 700 y 900 con `useFonts`
      (las subrutas por peso de `@expo-google-fonts/schibsted-grotesk`); la app no se dibuja hasta tenerla.
      La paleta vieja (`colors.ts`, `typography.ts`, `spacing.ts`) sigue solo para miembros, roles y baneos.
- [x] Catálogo en `src/ui/` con los nombres y props de la web: `Text` (las escalas de los tokens),
      `Logo`, `Background` (degradés de los tokens con `react-native-svg`, deriva de 60 s), `DisplayText`
      (letras que suben al activarse; marca de agua ajustada al ancho midiendo con una copia invisible, con
      barrido), `SectionLabel`, `UnderlineInput`, `ActionLink`, `BlockButton`, `Tabs`, `Choice`,
      `SquareAvatar`, `ServerStrip`, `Toast`, `EmptyState`, `Skeleton`, `ConnectionBanner` y `Modal` /
      `ModalForm` / `ModalActions`. Movimiento con `Animated` (`ui/motion.ts`, duraciones y curvas de los
      tokens; con "reducir movimiento" del sistema, fundidos de 150 ms).
- [x] Degradé radial: `rx` / `ry` son de react-native-svg y el SVG de la web los ignora; se dibuja con `r` y
      una escala vertical (`gradientTransform`), igual en las dos plataformas.
- [x] Auth: `useAuthForms` pasó de la web a core (`core/auth/forms.ts`; recibe las acciones de la sesión,
      la web le pasa su `authService` para que los tests lo sigan espiando). `views/AuthView` es la pantalla
      de la web en nativo: formulario arriba, palabras gigantes al pie, entrada escalonada, errores por
      campo y todos los estados (recuperar, verificá tu email, suspendida, error, elegir usuario: antes
      mobile cerraba la sesión en ese caso). `AuthProvider` quedó con la sesión, el token y el logout.
      Intro "amanecer" (`views/DawnIntro`), una sola vez por dispositivo.
- [x] Estructura (`components/MobileShell`, piezas en `components/shell/`), como la mobile web: barra
      inferior (Servidores, Mensajes, Avisos, Perfil), tira de franjas arriba con crear y unirse, encabezado
      gigante por pantalla, menú del servidor (`Invitar al servidor +` y `menú v`), canal y llamada a pantalla
      completa con `‹ Torton`, la llamada en curso sobre la barra inferior (canal, estado, micrófono, audio y
      colgar) y la línea de reconexión. La barra inferior se oculta con el teclado abierto. Mensajes y
      Avisos, vacíos con "próximamente" (no hay backend). Perfil: identidad, presencia (solo la sesión),
      estado personalizado (se guarda), tema y atajos.
- [x] Canales: `•nombre`, el activo con la barra negra, no leídos en bloque negro, editar manteniendo
      presionado, categorías con `SectionLabel` (los canales bajan escalonados al abrir) y participantes de
      voz con avatar cuadrado y el contorno que late en quien habla. El modo ordenar sigue con flechas.
- [x] Chat: avatar cuadrado, autor en negrita y fecha `20/10/25, 13:25`, separadores por día y agrupado por
      autor (las reglas pasaron a `core/chat/format.ts`, con tests, y la web las usa de ahí), `enviando/` y
      `/ no se envió`, entrada solo de los mensajes nuevos, encabezado con el estado y `_editar`, barra de
      escritura de una línea con `ENVIAR /`. Se sacó el botón de adjuntar: no hacía nada.
- [x] Voz: mosaico a sangre con la etiqueta negra, borde que late en quien habla, reacomodo con
      `LayoutAnimation`, silenciado para vos, e `Invitar a la llamada +`. Los controles están en la barra de
      la llamada.
- [x] Modales con la cortina: confirmaciones (textos de la web, rojo solo en las destructivas, el bloque
      cargando), crear servidor y unirse con código, invitar (vencimiento y usos con `Choice`, como la
      web), crear / editar / eliminar canal, crear categoría, editar perfil (avisos de la app en vez de
      `Alert`) y silenciar a alguien de la llamada.
- [x] Catálogo de desarrollo: Expo web con `?catalogo` (`views/Catalog`), en los dos temas.
- [x] Ajustes del servidor (`components/settings/server/`) sobre el marco `settings/SettingsScreen` (la
      versión de pantalla chica de la web: identidad y ×, menú de palabras gigantes en una fila que se
      desliza hasta la activa, celdas una por fila, cortina): RESUMEN (identidad en "próximamente" y
      números), ROLES (crear con color, lista, editar nombre y color, por defecto y eliminar con
      confirmación, miembros del rol, permisos con interruptores y la barra negra de cambios sin guardar),
      MIEMBROS (roles con × y `_rol +`, silenciar, expulsar y banear con motivo, `_cargar más`) y BANEOS
      (revocar con confirmación en la fila); INVITAR y ELIMINAR (pide escribir el nombre) o ABANDONAR en el
      menú. Se abren desde el menú del servidor (ajustes, miembros, roles). Reemplazan a `RolesModal`,
      `MembersModal`, `BansList` y `RolePermissionsEditor`, que se borraron con los hooks del bitmask.
- [x] Lógica de roles, miembros y baneos en core (`core/admin/`): `useRolesAdmin` (las confirmaciones las
      pone quien lo usa: la web, `window.confirm`; mobile, su modal), `useServerMembersAdmin` (la página
      siguiente con `loadMore`; la web le suma su `IntersectionObserver`) y `useServerBansAdmin`, más
      `PERMISSION_CATEGORIES`, `PRESET_ROLE_COLORS` y `hasBackendBit` (los permisos sin bit en el backend se
      muestran sin poder activarse). La web los usa desde ahí. Corregido de paso: en la web el permiso
      "Ver registro de auditoría" tenía el id `VIEW_[]` (era `VIEW_AUDIT_LOG`).
- [x] Ajustes de usuario (`components/settings/user/`): CUENTA (nombre de usuario y correo, con
      `_mostrar`; contraseña y dos factores en "próximamente") y EXPERIENCIA (el tema, que salió de Perfil);
      CERRAR SESIÓN en el menú. Se abren con `_ajustes` en Perfil. Como en iOS un modal no se presenta
      encima de otro que no lo contiene, las acciones de los ajustes que abren un modal los cierran antes.
- [x] Modelos unificados con core: `Server`, `Channel`, `Category`, `User` y `Message` son los de core
      (mobile solo suma el estado del envío optimista). Se borraron `data/mock.ts` y lo que vivía de él en el
      `DataProvider` (DMs, avisos, auditoría, editar / borrar / reaccionar mensajes locales) y del
      `UIProvider` (modales, confirmaciones y voz simulados): la app arranca vacía, con esqueleto hasta que
      responde el backend, y si falla no quedan servidores inventados.
- [x] Corregido en core (también afectaba a la web): Chat-Engine manda solo `createdAt`, y la interfaz usa
      `timestamp`. Con el backend real el historial quedaba sin fecha ni separadores (los backends falsos de
      los tests sí mandaban `timestamp`). `normalizeMessage` completa los dos en el historial, el envío por
      REST y lo que llega por el WebSocket, con tests.
- [ ] Probar en Android (APK con EAS) e iOS: lo de arriba se verificó en Expo web (Chrome, 390 px, claro y
      oscuro, contra un backend falso); no hay simuladores en esta máquina. Revisar sobre todo el teclado
      con la barra de escritura, la cortina de los modales y las fuentes en Android.

### Paso 14: cierre

- [x] Accesibilidad: foco visible (contorno negro de 2px), navegación con teclado, contraste,
      movimiento reducido. axe-core (dev) corre en los tests sobre el catálogo completo
      (`ui/__tests__/a11y.test.tsx`) y sobre inicio, chat, ajustes, crear servidor y mobile web (prueba de
      humo); el contraste lo miden los tokens y Lighthouse sobre `/?catalogo` en los dos temas (sin fallas).
      Corregido: el punto de presencia y "silenciado para vos" eran `span` con `aria-label` sin rol (ahora
      `role="img"`), las iniciales de la franja de servidor no coincidían con su nombre accesible (ahora
      `aria-hidden`), las secciones de los ajustes eran un segundo `<main>` debajo del diálogo (ahora
      `<section>` con nombre), la tira de servidores de mobile web quedaba fuera de todo landmark (ahora
      `<nav>`) y el campo de editar mensaje no tenía foco visible.
- [x] Rendimiento: animaciones solo con `transform` y `opacity` (los cambios de color son de ≤ 150 ms);
      medido con Lighthouse sobre el build, en la pantalla de acceso: rendimiento 99 (escritorio) / 91
      (mobile), accesibilidad 100, buenas prácticas 77 (solo por la cookie de terceros del login silencioso
      de Auth0). El chunk principal bajó de 826 kB a 178 kB: react, motion, auth0 y react-query en chunks
      propios (`manualChunks`), y ajustes y perfil propio con `lazy` y precarga en segundo plano. livekit
      ya se cargaba recién al entrar a voz.
- [x] Tests de los componentes base y de los flujos principales. Los componentes base ya tenían tests
      (`catalog.test.tsx`, `Modal.test.tsx`); se sumó `ServerStrip`. Los flujos (inicio, servidor, chat
      por WebSocket, presencia de voz, ajustes, modales, perfil, cerrar sesión, reconexión, avisos y mobile
      web) están en la prueba de humo. 170 tests en web, 153 en core y 21 en tokens.
- [x] Hacer `nuevo` el diseño por defecto, borrar el flag y los tokens de Discord. Se borraron las carpetas
      `legacy/` (57 archivos, ~11.500 líneas) y las vistas sin uso; `ui/flag.ts` pasó a `ui/theme.ts` (solo
      el tema: `initTheme`, `?tema=`, preferencia de ajustes) y los tokens y `base.css` van en `:root` sin
      `[data-ui]`. `index.css` quedó como reset. Quedan `#5865f2` solo como colores por defecto de datos
      del usuario (banner, paleta de roles) y en los datos de prueba.
- [x] README de la WebApp y de mobile, ADR de diseño ([`ADR-02-Lenguaje-Visual.md`](ADR-02-Lenguaje-Visual.md))
      y capturas ([`capturas/`](capturas/), web en los dos temas y mobile web, con el modo mock y un backend
      falso). La guía de pruebas quedó sin el flag. Faltan capturas de la app nativa: se toman con el APK
      (ver el pendiente del paso 13).
