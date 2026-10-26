## ADR 02: Lenguaje visual propio y tokens de diseño compartidos

**Contexto:**
Hasta octubre de 2026 la web y la app mobile se veían como un clon de Discord: gris oscuro, azul violáceo
(`#5865f2`), avatares redondos y burbujas. Los colores vivían en `index.css` (`--brand`, `--bg-primary`, ...)
y en `apps/mobile/src/theme/`, con valores distintos en cada plataforma, más de 1400 estilos en línea y 741
colores hex sueltos en los componentes de la web. El objetivo del rediseño (`docs/TODO-REDISENO.md`) era que
Discordia tuviera identidad propia, con transiciones y efectos visuales, sin perder accesibilidad ni
duplicar trabajo entre web y mobile.

La referencia visual es el PDF `Rediseño de discord.pdf` (capturas en [`design/`](design/README.md)). El PDF
no cubre todo: faltaban modales, toasts, estados de carga y vacíos, el chat de DMs, el modo oscuro y la
mobile. Su gris de texto (`#b8babc`) tampoco se lee sobre el fondo celeste (1.3–1.7:1).

**Decisión:**

1. **Estilo editorial / suizo.** Grilla de líneas de 1px, tipografía como protagonista, radio 0 y sin
   sombras. El acento son los bloques negros invertidos (barra de usuario, etiqueta del rail, botón
   primario). Los avatares son cuadrados y los servidores, franjas rectangulares. Hay palabras gigantes en
   mayúsculas como navegación y como marca de agua del contexto. El microcopy lleva barra final
   (`Conectado/`) y las acciones, guion bajo (`_editar`). Las pantallas que el PDF no muestra se derivan de
   estas reglas (sección 3 del TODO).
2. **Una sola fuente de verdad: `packages/tokens`.** Colores, degradés, tipografía (Schibsted Grotesk 400,
   700 y 900), espaciado, líneas y movimiento están en TypeScript, y salen en dos formatos:
   - Web: `tokens.css`, con variables CSS prefijadas por categoría (`--color-`, `--font-`, `--space-`,
     `--motion-`). Se genera con `npm run build:css -w @discordia/tokens` y se versiona. Un test falla si
     quedó desactualizado.
   - Mobile: `nativeTheme(scheme)`, el mismo tema como objeto para `StyleSheet`.
   Los componentes solo usan tokens. Los colores fijos que quedan son datos del usuario (banner, colores
   de rol, presencia) y el negro de la intro.
3. **Contraste AA verificado por CI.** El gris del PDF se reemplazó por `--color-text-muted` (`#50565c`,
   texto chico) y `--color-text-display-inactive` (`#6b7177`, solo texto ≥ 24px). `#b8babc` queda para
   decoración. `contrast.test.ts` mide cada par texto/fondo en los dos temas y sobre cada parada del
   degradé. Un token que no llegue a AA (o a 3:1 en las líneas que marcan algo) no pasa.
4. **Modo oscuro ("noche") con los mismos tokens.** Se deriva de la intro y se activa con `data-theme` en
   `<html>` (`dark`, o `system` con `prefers-color-scheme`). Sin elección guardada, sigue al sistema. La
   elección se guarda en `localStorage` (web) y en `AsyncStorage` (mobile). Cambiar de tema no requiere
   tocar componentes.
5. **Mismo catálogo de componentes en las dos plataformas, implementación propia en cada una.** `Logo`,
   `DisplayText`, `SectionLabel`, `UnderlineInput`, `ActionLink`, `BlockButton`, `Tabs`, `Choice`,
   `SquareAvatar`, `ServerStrip`, `Toast`, `EmptyState`, `Skeleton`, `ConnectionBanner` y `Modal` tienen
   los mismos nombres y props en `apps/web/src/ui` (React DOM + CSS Modules) y en `apps/mobile/src/ui`
   (React Native). Las dos tienen un catálogo navegable con `?catalogo`.
6. **Movimiento con propósito y reducible.** En la web se usa `motion`; en mobile, `Animated` y
   `LayoutAnimation`, sin dependencias nativas nuevas. Duraciones y curvas salen de los tokens, y solo se
   animan `transform` y `opacity` (los cambios de color duran ≤ 150 ms). Con `prefers-reduced-motion`
   (o "reducir movimiento" del sistema) todo queda en fundidos de 150 ms y se omite la intro.
7. **Corte sin convivencia.** Mientras se migraba, la web tuvo un flag (`data-ui="nuevo"`, solo en
   desarrollo) para poder mergear de a poco sin publicar una app mitad vieja y mitad nueva. En el paso 14 se
   borraron el flag, las vistas anteriores (~11.500 líneas en carpetas `legacy/`) y los tokens de Discord.
   La mobile se migró en el lugar, porque el APK se arma a mano.

**Alternativas descartadas:**

| Alternativa | Por qué se descartó |
|---|---|
| Mantener la estética de Discord y solo cambiar la paleta | No resuelve el objetivo: seguía viéndose como un clon. |
| Usar el gris del PDF tal cual | 1.3–1.7:1 sobre el cielo. No cumple WCAG AA y no se lee. |
| React Native Web (un solo código de interfaz) | Obliga a reescribir las ~24 mil líneas de la web, y los efectos (texto gigante recortado, degradés animados, cortinas) son más difíciles fuera del DOM. No llegaba para la entrega del 04/12. |
| Tailwind u otra librería de componentes | Ya teníamos CSS Modules en la web, y una librería genérica trae radios, sombras y estilos que el diseño elimina. Los tokens propios generan los dos formatos que necesitamos. |
| Tokens duplicados a mano en cada plataforma | Es lo que había antes y había divergido. Generarlos desde un solo paquete evita que se separen. |
| Reemplazar todo de una vez, sin flag | Cloudflare Pages publica desde `main`: habría bloqueado los merges durante semanas o publicado pantallas a medias. |

**Consecuencias:**

* Cambiar un color, una medida o una duración es cambiar un token y regenerar `tokens.css`. El cambio llega
  a web y mobile, y el test de contraste lo valida en los dos temas.
* Un componente nuevo tiene que existir en los dos catálogos, con la misma API, si se usa en las dos
  plataformas. Es más trabajo que compartir el código, pero cada plataforma conserva sus efectos.
* La accesibilidad se controla en tres niveles: contraste de tokens (`packages/tokens`), axe-core en los
  tests de la web (catálogo completo y pantallas principales, salvo contraste, que jsdom no calcula) y
  Lighthouse sobre `/?catalogo` en los dos temas.
* Medición del 24/10/2026 con Lighthouse sobre el build, en la pantalla de acceso: rendimiento 99
  (escritorio) y 91 (mobile), accesibilidad 100. Buenas prácticas da 77 solo por la cookie de terceros del
  login silencioso de Auth0 (`prompt=none`). Se resolvería con un dominio propio de Auth0, fuera del
  alcance del rediseño.
* Pendiente: probar la app nativa en Android e iOS reales. Se verificó en Expo web, a 390 px y en los dos
  temas.
