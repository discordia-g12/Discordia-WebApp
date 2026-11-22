## ADR 03: Login del backoffice con el mismo acceso que la web

**Estado:** reemplaza la decisión anterior de este ADR (Universal Login de Auth0, ver "Historial").

**Contexto:**
El backoffice (`apps/backoffice`, `backoffice.discordia.lol`) es una app aparte de la web y solo la usa el
staff de la plataforma. Por qué es una app aparte, cómo se asigna el rol y quién autoriza qué está en
[`Gateway/docs/ADR-002-Rol-Staff-Backoffice.md`](https://github.com/discordia-g12/Gateway/blob/develop/docs/ADR-002-Rol-Staff-Backoffice.md).
Este ADR decide cómo inicia sesión.

La primera versión redirigía a la pantalla de login de Auth0 (Universal Login). Funcionaba, pero se veía
distinta al resto de Discordia: el Branding de Auth0 nunca se configuró, y aun configurado no llega al
lenguaje visual del [ADR 02](ADR-02-Lenguaje-Visual.md) (las palabras gigantes al pie, los campos
subrayados, el resplandor). Además no ofrecía Google, que la web sí tiene.

La web usa un formulario propio: manda email y contraseña a Auth0 con el grant *password-realm*
(`passwordRealmLogin` en `packages/core/src/auth/auth0.ts`), y Google por redirección con la conexión de
Google (Auth0 no muestra su pantalla). Desde entonces la web también tiene 2FA propia (TOTP en
Auth-User-Service, `/api/v1/users/me/2fa/*`), que era la razón principal para no repetir ese formulario en
el backoffice.

**Decisión:**

1. **El mismo acceso que la web.** `AccessScreen` usa la misma estructura y los mismos componentes que el
   login de la web: campos subrayados, "Iniciar sesión" en bloque negro con el botón de Google al lado
   (`GoogleButton`, ahora en el catálogo `apps/web/src/ui`), "¿Olvidaste tu contraseña?" y la palabra
   gigante al pie. No hay registro: las cuentas staff son cuentas de Discordia a las que se les da el rol.
2. **Email y contraseña con *password-realm*, con la aplicación de Auth0 del backoffice.** `configureAuth`
   de core se carga con el client ID del backoffice, así que la Action sigue distinguiendo un login del
   backoffice de uno de la web y rechaza a quien no es staff (`staff_only`). Core ahora traduce ese
   rechazo a `StaffOnlyError` (antes cualquier `access_denied` era "cuenta suspendida") y el backoffice
   muestra "Esta cuenta no es staff".
3. **Google por redirección**, con `connection: 'google-oauth2'`: va directo a Google, sin la pantalla de
   Auth0, y vuelve a `/callback` como antes.
4. **2FA, la misma de la web**, para las dos formas de entrar y también al recargar con la sesión de Google:
   con el token ya emitido, si la cuenta tiene la 2FA activa no se muestra el backoffice hasta validar el
   código (o uno de recuperación). A diferencia de la web, **si la 2FA no se puede consultar no se entra**
   (la web la saltea): para el staff es preferible reintentar.
5. **Token en memoria**, como antes. Con contraseña no hay sesión de Auth0 que renovar: al recargar o
   cuando vence el token se vuelve a pedir. Con Google, al recargar se renueva en el iframe oculto
   (`prompt=none`), igual que con Universal Login.
6. **Recupero de contraseña:** el mismo endpoint de la web (`POST /api/v1/auth/password-reset`) y los mismos
   mensajes (`describePasswordResetError` de core).

**Alternativas descartadas:**

* **Seguir con Universal Login y configurar el Branding de Auth0.** Es lo más seguro (la contraseña nunca
  pasa por nuestra página) y Auth0 lo recomienda, pero la personalización de Auth0 no llega al lenguaje
  visual de Discordia, y el login del staff seguiría siendo distinto al de la web.
* **Pantalla propia que solo redirija** (Google directo y "entrar con email" hacia Universal Login). Se ve
  como Discordia hasta el clic, pero la contraseña se escribe en la pantalla de Auth0: el mismo problema
  de estética en el paso que importa.
* **Reusar la aplicación de Auth0 de la web.** La Action no podría distinguir un login del backoffice de
  uno de la web, así que no podría rechazar a quien no es staff.
* **Guardar el token en sessionStorage como la web.** Evitaría pedir la contraseña al recargar, pero deja
  el token de una cuenta que puede suspender usuarios y borrar servidores al alcance de un XSS.

**Consecuencias:**

* **La contraseña del staff pasa por `backoffice.discordia.lol`** (va directo a Auth0 por HTTPS, no se
  guarda). Es lo mismo que ya hace la web con todas las cuentas.
* **La 2FA es de interfaz**, igual que en la web: el token que emite Auth0 ya es válido para la API antes
  de ingresar el código; lo que se bloquea es el backoffice. Para exigirla también en el servidor, el paso
  siguiente es la MFA de Auth0 para la aplicación del backoffice (`api.multifactor.enable` en la Action):
  así Auth0 no emite el token sin el segundo factor.
* **Configuración de Auth0 nueva** para la aplicación "Discordia Backoffice" (ver
  [`apps/backoffice/README.md`](../apps/backoffice/README.md)): habilitar el grant *Password*, tener el
  origen del backoffice en *Allowed Web Origins* (el `POST /oauth/token` es una llamada del navegador) y
  habilitar la conexión de Google para la aplicación. Sin el grant, el login con contraseña falla con el
  mensaje genérico de credenciales.
* **Con contraseña, cada recarga pide entrar de nuevo.** Con Google, solo si el navegador bloquea la
  cookie de Auth0 (Safari, Firefox en modo estricto): un clic, sin contraseña.
* Si cambia el login de la web, hay que cambiar el del backoffice: comparten componentes (`@web/ui`) y la
  lógica de core, pero el CSS de la pantalla está duplicado en `AccessScreen.module.css`.

**Historial:**

La primera versión de este ADR eligió Universal Login: la contraseña del staff nunca pasaba por el
backoffice, la 2FA quedaba a cargo de Auth0 (con el formulario propio había que programarla a mano) y
Auth0 desaconseja *password-realm* en aplicaciones de navegador. Se reemplazó cuando la web sumó su propia
2FA y quedó como la única pantalla de Discordia con otra estética.
