# Discordia Backoffice

Backoffice web de la plataforma (`backoffice.discordia.lol`): la administración que la consigna pide como componente aparte del cliente web. Lo usa solo el **staff**, el rol global de plataforma (no los roles de cada servidor).

Es una app aparte de la web, en el mismo monorepo:

- **Comparte** con la web `@discordia/core` (rol del token, cliente de la API) y `@discordia/tokens`, además del catálogo de componentes de `apps/web/src/ui` (alias `@web`, en `vite.config.ts` y `tsconfig.json`). Por eso tiene la misma estética.
- **Tiene propio** su login (aplicación de Auth0 aparte), su dominio y su proyecto de Cloudflare Pages.

Las decisiones de seguridad están en [`Gateway/docs/ADR-002-Rol-Staff-Backoffice.md`](https://github.com/discordia-g12/Gateway/blob/develop/docs/ADR-002-Rol-Staff-Backoffice.md).

## Estado

| Sección | URL | Historias (consigna) | Estado |
|---------|-----|----------------------|--------|
| Usuarios | `/usuarios` | Listado con filtros, suspender, reactivar | **Funciona** (Auth-User `/api/v1/admin/users`): listado paginado con búsqueda por email, @usuario o nombre y filtro por estado; suspender y reactivar con confirmación, también desde cada fila |
| Servidores | `/servidores` | Listado, suspender (y levantar), eliminar | Listado (búsqueda por nombre o id, filtro de estado, muestra el id), suspender por id, levantar y eliminar por id: listo (Server-Roles `/api/v1/admin/servers`) |
| Expedientes | `/expedientes` | Expediente de usuario o servidor | Próximamente |
| Métricas | `/metricas` | Métricas globales de la plataforma | **Funciona** (Notification-Audit-Metrics `GET /api/v1/admin/metrics`): usuarios activos, servidores creados y mensajes enviados en los últimos 7, 30 o 90 días o un rango de hasta 366 días; un dato que falta (servicio caído) dice "sin datos" |
| Estado | `/estado` | Estado de la plataforma e incidentes | Estado de los servicios funciona (`GET /api/v1/admin/status`, cada 30 s); incidentes, próximamente |
| Observabilidad | `/observabilidad` | Links a Grafana | Funciona |

Cada pantalla ya tiene su forma final (filtros, columnas, confirmaciones), deshabilitada con "próximamente" hasta que exista su endpoint de staff. El estado de cada función está en [`src/features.ts`](src/features.ts). Para habilitar una:

1. Implementar el endpoint siguiendo el checklist del ADR-002 del Gateway (§4).
2. Pasar la función a `'ready'` en `src/features.ts`.
3. Reemplazar la lista vacía de la sección por el hook de React Query; los tipos esperados están en `src/sections/types.ts`.

## Correrlo

Desde la raíz del monorepo, con las dependencias instaladas (`npm install`):

```bash
npm run dev:backoffice          # http://localhost:5174 (la web sigue en 5173)
```

**Sin Auth0 ni backend (modo mock):** entra directo como staff.

```bash
VITE_USE_MOCK=true npm run dev:backoffice
```

Con `?rol=user` en la URL entra como usuario común, para ver la pantalla "sin acceso".

**Con Auth0:** copiar `.env.example` a `.env` en esta carpeta y completar `VITE_AUTH0_CLIENT_ID` con el de la aplicación "Discordia Backoffice" (ver abajo).

Otros comandos: `npm test -w @discordia/backoffice`, `npm run typecheck -w @discordia/backoffice` y `npm run build:backoffice`. El build queda en `apps/backoffice/dist`.

## Acceso

1. **Login.** Universal Login de Auth0 (redirección), con una aplicación de Auth0 propia. La Action de login (`Gateway/auth0/post-login-action.js`) rechaza ahí a quien no es staff, así que un usuario común no obtiene un token para el backoffice.
2. **Token.** Se guarda solo en memoria. Al recargar se renueva con la sesión de Auth0; si el navegador bloquea esa cookie, aparece "Entrar" y la redirección vuelve sin pedir la contraseña.
3. **Rol.** Con el token, el backoffice lee el rol del claim `https://discordia.app/role`. Si no es `staff`, muestra "Esta cuenta no es staff" y no muestra nada más.
4. **Autorización real.** El paso 3 es solo de interfaz: cada endpoint de staff lo vuelven a autorizar Kong (`validate("staff")`) y el servicio.

### Dar el rol staff (por ejemplo, al corrector)

La consigna pide un mecanismo por fuera de la interfaz. El rol sale de `app_metadata.role` en Auth0, que el usuario no puede editar:

1. Auth0 Dashboard → User Management → Users → la cuenta.
2. En **app_metadata**, poner `{ "role": "staff" }` y guardar.
3. Que esa persona cierre sesión y vuelva a entrar: el rol se lee del token nuevo.

### Configuración de Auth0 (una vez)

- Crear la aplicación **Discordia Backoffice**, tipo *Single Page Application*:
  - **Allowed Callback URLs:** `http://localhost:5174/callback, https://backoffice.discordia.lol/callback`
  - **Allowed Logout URLs** y **Allowed Web Origins:** `http://localhost:5174, https://backoffice.discordia.lol`
- Darle acceso a la API `https://api.discordia.com` (la misma audience que la web).
- En la Action de login, agregar el secret `BACKOFFICE_CLIENT_ID` con el client ID de esta aplicación y volver a desplegar la Action.
