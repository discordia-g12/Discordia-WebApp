## ADR 03: Login del backoffice con Universal Login de Auth0

**Contexto:**
El backoffice (`apps/backoffice`, `backoffice.discordia.lol`) es una app aparte de la web y solo la usa el
staff de la plataforma. Por qué es una app aparte, cómo se asigna el rol y quién autoriza qué está en
[`Gateway/docs/ADR-002-Rol-Staff-Backoffice.md`](https://github.com/discordia-g12/Gateway/blob/develop/docs/ADR-002-Rol-Staff-Backoffice.md).
Este ADR decide cómo inicia sesión.

La web usa un formulario propio: manda email y contraseña a Auth0 con el grant *password-realm*
(`passwordRealmLogin` en `packages/core/src/auth/auth0.ts`) y nunca sale de `app.discordia.lol`. Para el
backoffice había que elegir entre repetir ese formulario o usar la pantalla de login de Auth0 (Universal
Login).

Lo que pesa en la elección:

- Las cuentas staff son las más sensibles: pueden suspender usuarios y eliminar servidores.
- La consigna tiene la historia optativa "Autenticación de dos factores (2FA)", y para el staff conviene
  exigirla aunque no se implemente para todos.
- La Action de login rechaza a quien no es staff cuando entra desde la aplicación "Discordia Backoffice"
  (`api.access.deny("staff_only")`).

**Decisión:**

1. **Universal Login.** "Entrar" redirige a la pantalla de Auth0 (Authorization Code con PKCE, con
   `loginWithRedirect` de `@auth0/auth0-spa-js`, en `apps/backoffice/src/auth/auth0.ts`). Auth0 vuelve a
   `/callback` y el backoffice lee el rol del access token. La aplicación de Auth0 es propia del backoffice
   y no tiene habilitado el grant *password*.
2. **La contraseña nunca pasa por el backoffice.** Se escribe solo en el dominio de Auth0.
3. **Token en memoria.** Al recargar, el token se renueva en un iframe oculto con la sesión de Auth0
   (`prompt=none`). Si el iframe no responde en 8 segundos o Auth0 dice que no hay sesión, se muestra
   "Entrar"; con la sesión de Auth0 todavía activa, la redirección vuelve sin pedir la contraseña.
4. **Aspecto de Discordia, configurado en Auth0.** Logo, colores, tipografía y radio de la pantalla de
   login se configuran en Auth0 → Branding → Universal Login, siguiendo el lenguaje visual del
   [ADR 02](ADR-02-Lenguaje-Visual.md): fondo claro, botón primario en bloque negro, Schibsted Grotesk y
   radio 0. No requiere código.

**Alternativas descartadas:**

* **Formulario propio con password-realm, como la web.** La contraseña del staff pasaría por nuestra
  página, y la 2FA habría que programarla a mano: detectar el error `mfa_required`, pedir el código y
  canjearlo con `/mfa/challenge` y el `mfa_token`, además de la pantalla de enrolamiento y los códigos de
  recuperación. Auth0 desaconseja este grant en aplicaciones de navegador.
* **Lock (el widget embebido de Auth0).** Pone el formulario dentro de la página, con los mismos
  problemas de la opción anterior, y Auth0 recomienda Universal Login en su lugar.
* **Reusar la aplicación de Auth0 de la web.** La Action no podría distinguir un login del backoffice de
  uno de la web, así que no podría rechazar a quien no es staff ni exigir 2FA solo al staff.

**Consecuencias:**

* El login del backoffice se ve distinto al de la web hasta configurar el Branding de Auth0. Esa
  configuración aplica a todas las aplicaciones del tenant, pero no cambia nada en la web, que no usa
  Universal Login para el login con contraseña.
* La pantalla de login está en el dominio del tenant (`dev-dppme5iaqg60gkmo.us.auth0.com`). Un dominio
  propio para Auth0 (por ejemplo `login.discordia.lol`) queda como mejora posible.
* La renovación en el iframe usa la cookie de Auth0, que para `backoffice.discordia.lol` es de otro sitio.
  Los navegadores que bloquean cookies de terceros (Safari, Firefox en modo estricto) muestran "Entrar"
  en cada recarga; es un clic y no pide la contraseña. Con un dominio propio de Auth0 bajo
  `discordia.lol`, la cookie pasaría a ser del mismo sitio.
* La 2FA del staff no cubre la historia de 2FA para todos los usuarios: la web tiene su propio formulario,
  así que esa historia necesita su propio diseño (el paso del código en ese formulario, o pasar la web a
  Universal Login).
* La configuración que tiene que existir en Auth0 (URLs de la aplicación, acceso a la API y el secret
  `BACKOFFICE_CLIENT_ID` de la Action) está en [`apps/backoffice/README.md`](../apps/backoffice/README.md).
