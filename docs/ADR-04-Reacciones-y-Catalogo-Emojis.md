## ADR 04: Reacciones con Emojis y Arquitectura del Catálogo

**Contexto:**
La historia de usuario **[Op#48] Reacciones con emoji** (3 pts) requiere que los usuarios puedan reaccionar a mensajes de texto en canales de servidores y en conversaciones privadas (DMs) para expresar respuestas rápidas sin enviar mensajes nuevos.
Los criterios de aceptación establecen:
1. **CA 1**: Reacción exitosa en tiempo real (persistencia en el mensaje, emisión WebSocket a los visualizadores, incremento del contador en la UI).
2. **CA 2**: Quitar reacción propia (toggle: si el usuario vuelve a presionar el mismo emoji, se retira; si el contador llega a 0, la reacción desaparece).
3. **CA 3**: Control de permisos (en canales de servidor, se requiere el permiso `ADD_REACTIONS` = bit `1 << 13`; sin él, la API responde `403 Forbidden`. En DMs, las reacciones siempre están permitidas).

Anteriormente en el frontend existían constantes fijas y limitadas (`QUICK_EMOJIS` de 8 elementos y `POPULAR_EMOJIS` de 16 elementos) sin categorización ni previsión para la futura gestión de emojis personalizados por servidor (HU 75) o emojis animados del Plan Premium (HU 76).

**Decisión:**

1. **Contrato de API y Backend Agnóstico (`Chat-Engine-Service`):**
   - Se expone `PUT /channels/:channelId/messages/:messageId/reactions` con cuerpo JSON `{ "emoji": string, "emojiId"?: string }`.
   - Se utiliza `PUT` con cuerpo JSON (en lugar de parámetros de URL) para garantizar total compatibilidad con caracteres Unicode compuestos, modificadores de variación (`\uFE0F`), tonos de piel, y futuros identificadores de emojis personalizados de servidores (`emojiId`).
   - El backend no valida una lista blanca rígida de emojis, permitiendo cualquier emoji Unicode válido.
   - Se emite en tiempo real `MESSAGE_REACTION_UPDATED` (en canales) y `DM_MESSAGE_REACTION_UPDATED` (en DMs de participantes).
   - Los mensajes eliminados (`isDeleted: true`) rechazan cualquier intento de reacción con `400 Bad Request`.

2. **Resolución de Permisos en Core (`Server-Roles-Core-Service`):**
   - El endpoint `/internal/channels/{id}/access` expone `can_add_reactions: bool`, evaluando `access.has(Permission.ADD_REACTIONS)`.
   - Chat-Engine mapea este permiso a través de `channelAccessGuard` asignándolo a `req.canAddReactions`. En DMs se fija en `true` para participantes no bloqueados.
   - Quitar una reacción propia existente no exige `ADD_REACTIONS` (solo requiere acceso de lectura al canal), permitiendo revocar una interacción previa.

3. **Estructura del Catálogo por Capas (`@discordia/core`):**
   - **`QUICK_EMOJIS`**: Conjunto optimizado de 4 emojis esenciales (`['👍', '❤️', '😂', '🔥']`) para la barra rápida de 1 solo tap/clic sobre el mensaje.
   - **`POPULAR_EMOJIS`**: Conjunto ampliado de ~32 emojis balanceados para la sección de emojis populares/frecuentes.
   - **`EMOJI_CATEGORIES`**: Estructura extensible organizada en secciones con ícono representativo ("Frecuentes / Populares" `🕒`, "Caritas y Emociones" `😀`, "Gestos y Personas" `👋`, "Objetos y Símbolos" `💡`, y "Servidor" `🏷️`). Permite navegación y salto directo a cada sección.

4. **Desacoplamiento de la UI (Web y Mobile):**
   - **Web (`apps/web`)**:
     - Barra de herramientas flotante en el mensaje con los 4 `QUICK_EMOJIS` y botón `_reaccionar`.
     - Selector `EmojiPicker` categorizado con barra de navegación superior para saltar directamente a cada categoría y aviso informativo en la sección de Servidor indicando que los emojis personalizados se integrarán con la gestión de servidores (HU 75).
     - Badges de reacciones bajo el mensaje clickeables para alternar reacciones.
   - **Mobile (`apps/mobile`)**:
     - Badges de reacciones en `MessageItem.tsx` interactivos con `Pressable`.
     - En `MessageActionsModal.tsx` (long-press), cabecera rápida con los `QUICK_EMOJIS` y barra de botones de categoría para salto rápido con scroll animado.

5. **Evolución Futura (Frecuencias Dinámicas y Emojis Personalizados):**
   - Al estar el modelo de datos de reacciones y la API completamente desacoplados de la fuente visual del emoji, más adelante se podrá incorporar un cálculo dinámico de frecuencia por usuario o un selector como `emoji-mart` en la Web sin requerir modificaciones en la base de datos, en los WebSockets ni en los endpoints de Chat.
