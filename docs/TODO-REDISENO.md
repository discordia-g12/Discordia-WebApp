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
| Display | Palabras gigantes en mayúsculas como navegación (activa negra, inactiva gris) y **marca de agua cortada** al pie de la barra lateral con el contexto actual ("AMIGOS", nombre del servidor) |
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

- `tokens.css` ya trae el oscuro: con `data-theme="dark"`, o con `data-theme="system"` y la preferencia del
  sistema. Sin `data-theme` queda el claro; el paso 12 pasa el default a `system`.
- Por defecto sigue la preferencia del sistema (`prefers-color-scheme`). Selector manual en
  *Ajustes → Experiencia* (Claro / Oscuro / Sistema), guardado en `localStorage` (web) y `AsyncStorage` (mobile).
- MVP: se entrega el claro completo; el oscuro sale cuando todas las pantallas estén migradas a tokens (paso 12).

## 2. Movimiento

Librería: **`motion`** (ex framer-motion) en web. En mobile, `Animated` y `LayoutAnimation` de React Native
(sin dependencias nativas nuevas).

| Momento | Efecto |
|---|---|
| Primer ingreso | **Intro "amanecer"**: negro → resplandor celeste que sube (`gradiente 1`) → degradé claro (`gradiente 2`), ~1.8 s, se saltea con clic/tecla |
| Login ⇄ registro | Las palabras gigantes se intercambian (la activa sube y se oscurece), el formulario cruza con fundido |
| Verificando sesión | Barra de progreso que se llena bajo "SESIÓN" |
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
  para poder mergear de a poco sin publicar una app mitad vieja y mitad nueva.

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
| `UnderlineInput` | `label`, `required`, `hint`, `error`, `secret` |
| `ActionLink` | `children`, `onPress` (se muestra como `_texto`) |
| `BlockButton` | `children`, `tone: "default" \| "danger"`, `loading` |
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
- [x] React 19.2.3 y TypeScript 6.0.3 en la web, iguales a mobile: una sola copia en el monorepo.
- [x] `tsconfig.base.json` en la raíz, que extienden la web y `packages/core`. Mobile sigue con la base de Expo.
- [ ] ESLint: el script `lint` de la web ya estaba roto antes de esto (no hay ESLint instalado ni
      configurado). Configurarlo para todo el monorepo.
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
      `VITE_WS_URL`: en el compose del orquestador apunta directo al Chat-Engine, salteando Kong.

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

- [ ] Importar `@discordia/tokens/tokens.css` en la web (los tokens ya están, paso 1.3).
- [ ] Schibsted Grotesk y un activador del flag en desarrollo (`?ui=nuevo`, guardado en `localStorage`).
- [ ] Componentes base: `Logo`, `DisplayText` (gigante + marca de agua cortada), `SectionLabel` (`X /` con
      línea), `UnderlineInput`, `ActionLink` (`_editar`), `BlockButton` (bloque negro), `TabsUnderline`,
      `HairlineGrid`, `SquareAvatar`, `Toast`, `Skeleton`, `EmptyState`.
- [ ] `motion` + hook `useReducedMotion` con variantes compartidas (`fade`, `rise`, `sweep`, `curtain`).

### Paso 4: Auth (`AuthView`)

- [ ] Intro "amanecer".
- [ ] Login / registro con las palabras gigantes como pestañas animadas, campos subrayados, `_ocultar`.
- [ ] "VERIFICANDO SESIÓN" con barra de progreso.
- [ ] Errores de validación en línea bajo cada campo (texto chico con barra inicial).

### Paso 5: estructura (`App`, `ServerRail`, `UserPanel`)

- [ ] Layout en grilla con líneas y degradé de fondo animado.
- [ ] Rail con franjas de imagen, etiqueta negra desplegable, indicador de activo y de actividad nueva.
- [ ] Barra de usuario negra con estado (`Invisible/`, `En canal de voz/`) y controles de micrófono, audio y ajustes.
- [ ] Marca de agua del contexto con transición entre vistas.

### Paso 6: Home y amigos (`HomeView`)

- [ ] Tres columnas (DMs, amigos, activo ahora), pestañas con subrayado deslizable y estados vacíos.
- [ ] Chat de DMs (sección 3).

### Paso 7: servidor y chat (`ChannelSidebar`, `ChatView`, `MemberList`)

- [ ] Secciones con línea y colapso animado.
- [ ] Mensajes: avatar cuadrado, metadato chico, texto grande, respuestas, reacciones, adjuntos.
- [ ] Barra de escritura de una línea; enlaces del encabezado (`hilos`, `mensajes fijados`, ...).
- [ ] No romper reconexión, recuperación de mensajes ni paginación (requisitos del enunciado).

### Paso 8: voz (`VoiceView`)

- [ ] Mosaico a sangre con reacomodo animado e indicador de quién habla.
- [ ] Barra de controles en la barra lateral, `Invitar a la llamada +`, `Elegir actividad`.

### Paso 9: ajustes (`UserSettings`, `ServerSettings`, `OwnProfileView`)

- [ ] Pantalla completa con menú gigante y celdas de grilla; cortina de entrada y salida.
- [ ] Partir los archivos por pestaña (hoy tienen 1600–2600 líneas).
- [ ] Selector de tema en *Experiencia*.

### Paso 10: modales, toasts y conexión

- [ ] Modales, confirmaciones, toasts, banner de reconexión, esqueletos de carga (sección 3).

### Paso 11: mobile web (`MobileShell`)

- [ ] Barra inferior, tira de servidores, encabezados gigantes (sección 5).

### Paso 12: modo oscuro

- [ ] Completar `[data-theme="dark"]`, revisar contraste pantalla por pantalla, selector en ajustes.

### Paso 13: app mobile nativa

- [ ] Reemplazar `src/theme/` por `nativeTheme()` de `@discordia/tokens`, y cargar Schibsted Grotesk con
      `@expo-google-fonts/schibsted-grotesk` (los nombres de familia ya están en `fontFamily.native`).
- [ ] Implementar en React Native el catálogo de componentes (sección 6), con las mismas props que la web.
- [ ] Mismo orden que la web: auth → estructura y navegación → chat → voz → perfil y ajustes → modales.
- [ ] Probar en Android (APK con EAS) e iOS.

### Paso 14: cierre

- [ ] Accesibilidad: foco visible (contorno negro de 2px), navegación con teclado, contraste,
      movimiento reducido.
- [ ] Rendimiento: animaciones solo con `transform` y `opacity`; medir con Lighthouse.
- [ ] Tests de los componentes base y de los flujos principales.
- [ ] Hacer `nuevo` el diseño por defecto, borrar el flag y los tokens de Discord.
- [ ] README de la WebApp y de mobile, ADR de diseño ("lenguaje visual propio y tokens") y capturas.
