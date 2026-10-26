# Referencias del rediseño

Capturas del PDF `Rediseño de discord.pdf` (págs. 1–11), en JPEG liviano. Son solo de referencia: el sistema
de diseño y las reglas están en [`../TODO-REDISENO.md`](../TODO-REDISENO.md).

| Archivo | Pantalla |
|---|---|
| `01-intro-negro.jpg`, `02-intro-amanecer.jpg` | Intro "amanecer" |
| `03-iniciar-sesion.jpg`, `04-registrarse.jpg` | Login y registro |
| `05-verificando-sesion.jpg` | Verificando sesión |
| `06-amigos.jpg` | Home / amigos |
| `07-servidor-chat.jpg` | Servidor y chat de canal |
| `08-rail-hover.jpg` | Etiqueta del rail al pasar el mouse |
| `09-chat-adjuntos-respuestas.jpg` | Chat con adjunto, reacción y respuesta |
| `10-voz.jpg` | Canal de voz |
| `11-ajustes-cuenta.jpg` | Ajustes de usuario |

Los SVG originales del diseño (`svg/`, ~30 MB con imágenes embebidas) no se versionan. Lo que sí se usa en la
app ya está extraído:

- Logo: `apps/web/src/assets/logo.svg` (`fill="currentColor"`: toma el color del texto, así se invierte en el
  modo oscuro).
- Degradés de la intro (`gradiente 1` y `gradiente 2`): son radiales con el centro arriba del borde superior.
  Sus paradas de color pasan a `packages/tokens` (paso 1.3).
