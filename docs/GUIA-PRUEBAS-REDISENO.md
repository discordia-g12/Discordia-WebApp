# Guía de pruebas del rediseño (web y mobile)

Cómo levantar cada app y qué probar, caso por caso. Lo que el rediseño muestra como **"próximamente"** (no
se guarda en el backend todavía) no es un error: está listado al final.

## 0. Preparación (una vez)

1. Desde la raíz de `Discordia-WebApp`: `npm install` (instala web, mobile y los paquetes compartidos).
2. Backend: desde la raíz del orquestador, `docker compose up -d`. El Gateway queda en `http://localhost:8000`.
   Sin backend se puede probar parte de la web con el modo mock (ver 1.1).
3. Chequeos automáticos (desde la raíz de `Discordia-WebApp`):
   - `npm run typecheck`: los cuatro paquetes sin errores.
   - `npm test`: web, core y tokens en verde (incluye la prueba de humo de la web y los chequeos de accesibilidad con axe).
4. Tener dos cuentas para los casos con otra persona (miembros, chat, voz).

## 1. Web

### 1.1 Levantar

| Para | Cómo |
|---|---|
| Contra el backend local | `npm run dev` → `http://localhost:5173` |
| Sin backend (mock) | `VITE_USE_MOCK=true npm run dev -w @discordia/web` → `http://localhost:5173`. Cualquier email y contraseña entran; no hay servidores (solo sirve para acceso, inicio, perfil y ajustes de usuario) |
| Tema | sumar `?tema=oscuro`, `?tema=claro` o `?tema=sistema` |
| Catálogo de componentes | `http://localhost:5173/?catalogo` (y `&tema=oscuro`) |
| Mobile web | DevTools → modo dispositivo, ancho 390 px (todo lo de menos de 768 px usa el shell mobile) |

El tema se recuerda en el navegador. Desde el paso 14 el rediseño es el único diseño, también en el build de
producción (Cloudflare Pages).

### 1.2 Casos

**Acceso**

| # | Pasos | Esperado |
|---|---|---|
| W1 | Abrir en una ventana de incógnito | Intro "amanecer" (~4 s): negro → resplandor celeste → login. Un clic o una tecla la saltea. Al recargar no vuelve a salir |
| W2 | Login con credenciales incorrectas | Error en negrita sobre el botón, sin decir qué campo falló |
| W3 | Tocar REGISTRARSE / INICIAR SESIÓN al pie | Las palabras gigantes se intercambian (las letras de la activa suben) y el formulario entra escalonado |
| W4 | Registro con usuario de 2 letras, email inválido, contraseña débil, contraseñas distintas (de a uno) | Error bajo el campo correspondiente, con el foco en ese campo; los requisitos de contraseña se marcan ✓ al cumplirse |
| W5 | Registro válido con un email nuevo | Pantalla "VERIFICÁ TU EMAIL" con el correo; "Ya lo verifiqué" vuelve al login con el email cargado |
| W6 | ¿Olvidaste tu contraseña? → email | Mensaje de enlace enviado (el mismo exista o no la cuenta) |
| W7 | Login válido | Entra a la app sin pantalla de "verificando sesión" |

**Estructura, inicio y servidor**

| # | Pasos | Esperado |
|---|---|---|
| W8 | Pasar el mouse por las franjas del rail | Se despliega la etiqueta negra con el nombre; la activa está corrida |
| W9 | Inicio | Marca de agua `AMIGOS` al pie de la barra lateral, apoyada sobre la barra de usuario; pestañas de amigos con el subrayado que se desliza |
| W10 | Entrar a un servidor | La marca de agua barre al nombre del servidor (entero; uno largo parte en renglones); categorías `CANAL DE TEXTO /` colapsables |
| W11 | `menú v` | Panel con todas las acciones del servidor; abandonar / eliminar separado |
| W12 | Arrastrar un canal a otra posición | Línea de 2 px donde va a quedar; el orden se guarda |

**Chat**

| # | Pasos | Esperado |
|---|---|---|
| W13 | Abrir un canal con historial | Separadores `hoy` / `ayer` / fecha larga; fecha `20/10/25, 13:25` junto al autor; mensajes seguidos de la misma persona agrupados |
| W14 | Enviar un mensaje | Entra subiendo; el historial no se anima |
| W15 | Con otra cuenta, escribir en el mismo canal | Aparece en vivo, con fecha |
| W16 | DevTools → Network → Offline unos segundos y volver | Línea de 2 px arriba que avanza y `reconectando/` en la barra de usuario; al volver, se recuperan los mensajes del corte |

**Voz**

| # | Pasos | Esperado |
|---|---|---|
| W17 | Entrar a un canal de voz (y desde otra cuenta) | Mosaico de fichas; la nueva entra reacomodando las otras; borde que late en quien habla |
| W18 | Clic derecho en la ficha de otra persona → silenciar para mí | `silenciado para vos` en la ficha |
| W19 | Ir a otro canal de texto durante la llamada | Los controles siguen en la barra lateral; tocar el canal vuelve a la llamada |

**Ajustes, modales y avisos**

| # | Pasos | Esperado |
|---|---|---|
| W20 | Ajustes de usuario (engranaje) | Bajan como cortina; menú de palabras gigantes; Escape o × cierran |
| W21 | Experiencia → Oscuro / Claro / Sistema | Cambia el tema al instante y se recuerda al recargar |
| W22 | Ajustes del servidor → Roles: tocar un permiso | Barra negra "cambios sin guardar" con `_descartar` y guardar |
| W23 | Roles: crear, renombrar, cambiar color, hacer por defecto, eliminar | Se guardan; por defecto y eliminar piden confirmación |
| W24 | Miembros: `_rol +`, quitar rol con ×, silenciar (duración), expulsar, banear | Funcionan contra el backend; no se ofrecen sobre vos ni sobre quien creó el servidor |
| W25 | Baneos → revocar | Confirmación en la fila; desaparece de la lista |
| W26 | Crear servidor, unirse con invitación inválida, invitar | Modal que baja desde arriba; el error de invitación queda en el campo; invitar genera al abrir y ofrece `_generar otro enlace` al cambiar opciones |
| W27 | Eliminar servidor | Pide escribir el nombre; el bloque rojo solo se habilita al coincidir |
| W28 | Cualquier acción con aviso | Tira negra al pie, 4 s; los errores con borde rojo y `_reintentar` donde aplica |

**Transversales**

| # | Pasos | Esperado |
|---|---|---|
| W29 | Repetir W1–W28 con `?tema=oscuro` | Todo legible, sin colores del diseño anterior |
| W30 | Sistema con "reducir movimiento" activado | Sin intro; las transiciones quedan en fundidos cortos |
| W31 | Navegar con Tab | Foco visible en todos los controles; Escape cierra modales y ajustes |
| W32 | Mobile web (390 px) | Barra inferior (Servidores, Mensajes, Avisos, Perfil), tira de franjas arriba, encabezado gigante por pantalla; canal y llamada a pantalla completa con `‹ Servidor` |

## 2. Mobile (Expo)

### 2.1 Levantar

| Para | Cómo |
|---|---|
| Backend | Local: el de 0.2 (la app usa la IP de la máquina que corre Metro, puerto 8000). Desplegado: `EXPO_PUBLIC_API_URL` en `apps/mobile/.env` (ver `.env.example`) |
| Todo menos la voz | `npm run mobile` (= `expo start --go`) y escanear el QR con **Expo Go** |
| Con voz | Development build (ver `apps/mobile/README.md`). **Hay que regenerarlo**: el rediseño sumó `expo-font` y AsyncStorage, que son nativos. `npx eas-cli@latest build --profile development --platform android`, instalar el APK y `npm run start:dev -w @discordia/mobile` |
| Catálogo (navegador) | `npm run web -w @discordia/mobile` → abrir con `?catalogo` (componentes, llamada y barra de llamada de ejemplo, con selector de tema) |
| Build de prueba | `npx eas-cli@latest build --profile preview --platform android` (APK instalable, sin Metro) |

En el navegador (Expo web) la voz no funciona: sirve para revisar pantallas, no reemplaza al teléfono.

### 2.2 Casos

**Arranque y acceso**

| # | Pasos | Esperado |
|---|---|---|
| M1 | Primera apertura después de instalar | Intro "amanecer"; tocar la saltea. En la segunda apertura no sale |
| M2 | Mirar las fuentes | Schibsted Grotesk en toda la app (no la del sistema) |
| M3 | Login incorrecto / correcto | Igual que W2 y W7. Con el teclado abierto, el formulario sube y el botón queda visible |
| M4 | Registro con errores (como W4) | Error bajo el campo y el foco en él |
| M5 | Registro con un usuario que ya existe pero email nuevo | Pantalla "ELEGÍ TU USUARIO" (antes mobile cerraba la sesión) |
| M6 | Cerrar la app y abrirla | Vuelve al login (la sesión vive en memoria: es lo esperado) |

**Estructura**

| # | Pasos | Esperado |
|---|---|---|
| M7 | Recién logueado | Esqueleto de líneas mientras cargan los servidores; después, el primero elegido con su nombre en gigante |
| M8 | Con el backend apagado, loguear | Nunca aparecen servidores inventados (antes salían los de prueba) |
| M9 | Tocar otra franja de la tira de arriba | Baja la franja activa; cambia el encabezado y los canales |
| M10 | Barra inferior: Mensajes, Avisos, Perfil | Mensajes y Avisos: vacíos con "próximamente"; la pestaña activa en bloque negro |
| M11 | `+` de la tira | Crear servidor; `_unirme con una invitación` cambia al código |
| M12 | Brújula de la tira con un código válido / inválido | Entra al servidor / el error queda en el campo y el modal sigue abierto |
| M13 | `menú v` | Panel: invitar, ajustes, miembros, roles, crear canal y categoría, ordenar, abandonar / eliminar |
| M14 | Ordenar canales | Flechas en canales y categorías; el orden se guarda |
| M15 | Mantener presionado un canal | Editar canal (nombre, tema, categoría) con `_eliminar canal` → confirmación roja |

**Chat**

| # | Pasos | Esperado |
|---|---|---|
| M16 | Abrir un canal | A pantalla completa con `‹ Servidor`; encabezado `•general conectado/`; separadores y agrupado como W13 |
| M17 | Escribir | Al abrir el teclado la barra inferior se oculta y la de escritura queda sobre el teclado; el último mensaje sigue visible |
| M18 | Enviar | `enviando/` y después enviado; entra subiendo |
| M19 | Modo avión y enviar | Queda `/ no se envió` y aviso de error |
| M20 | Con otra cuenta escribir en el mismo canal | Aparece en vivo con nombre y fecha |

**Voz (development build)**

| # | Pasos | Esperado |
|---|---|---|
| M21 | Tocar un canal de voz | Pide el micrófono; mosaico; aviso de conectado |
| M22 | Volver con `‹` | La barra de llamada queda sobre la barra inferior en todas las pestañas: canal, estado, micrófono, audio y colgar (rojo) |
| M23 | Entrar a otro canal de voz | Confirmación "¿Cambiar de canal?" |
| M24 | Mantener presionada la ficha (o el nombre en la lista) de otra persona | "Silenciar para mí"; la ficha muestra `silenciado para vos` |
| M25 | Hablar desde la otra cuenta | Borde que late en su ficha y contorno en su avatar de la lista de canales |
| M26 | Colgar | Vuelve a los canales y desaparece la barra de llamada |
| M27 | En Expo Go, tocar un canal de voz | Aviso de que la voz necesita el development build (no se cuelga) |

**Ajustes y perfil**

| # | Pasos | Esperado |
|---|---|---|
| M28 | Perfil → presencia y estado personalizado | La presencia cambia en la sesión; el estado se guarda (`_guardar` / `_quitar`) |
| M29 | Perfil → `_editar perfil` | Elegir avatar de la galería, nombre y bio; se guarda con aviso |
| M30 | Perfil → `_ajustes` → Experiencia → tema | Cambia al instante; cerrar la app y abrirla lo conserva. "Sistema" sigue al modo del teléfono |
| M31 | Ajustes del servidor (como W22–W25) | Mismas reglas que la web; el menú se desliza hasta la sección elegida |
| M32 | Ajustes del servidor → INVITAR / ELIMINAR / ABANDONAR | Los ajustes se cierran y aparece el modal (en iOS no puede haber dos a la vez); eliminar pide escribir el nombre |
| M33 | Perfil → `_cerrar sesión` | Confirmación; si había llamada, se corta |

**Transversales**

| # | Pasos | Esperado |
|---|---|---|
| M34 | Teléfono en modo oscuro (tema "Sistema") | Toda la app en el tema noche, barra de estado clara |
| M35 | Accesibilidad → reducir movimiento | Sin intro ni desplazamientos: fundidos cortos |
| M36 | Android: botón atrás con un modal o los ajustes abiertos | Cierra el modal / los ajustes, no la app |
| M37 | iPhone con notch y Android con barra de gestos | Nada tapado arriba ni abajo (barra inferior por encima del área de gestos) |
| M38 | TalkBack / VoiceOver por las pantallas principales | Se leen botones, pestañas, canales y mensajes con nombre; las palabras gigantes se leen una vez |

## 3. Lo que no es error ("próximamente")

- **Ambas:** amigos, mensajes directos y avisos (no hay backend); identidad del servidor (no hay
  `PATCH /servers/{id}`), ícono al crear un servidor; contraseña y dos factores; permisos "Ver registro de
  auditoría" y "Video y pantalla" (sin bit en el backend); presencia, que vale solo para la sesión.
- **Web:** moderación, notificaciones, emojis y mejoras del servidor; notificaciones, voz y factura del
  usuario; banner del perfil.
- **Mobile:** cámara y pantalla compartida (la voz es solo audio); los ajustes de usuario y de servidor tienen
  solo las secciones con backend.

## 4. Si algo falla

Anotar: plataforma y versión (navegador, Android / iOS y modelo), tema (claro / oscuro), el número de caso,
qué se esperaba y qué pasó, y una captura. En mobile, si la app se cierra, la salida de Metro en la
terminal suele tener el error.
