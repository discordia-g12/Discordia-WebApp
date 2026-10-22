# Discordia-WebApp

Clientes de Discordia: la web (React + Vite) y la app mobile (Expo / React Native), en un monorepo con
npm workspaces.

```text
apps/
├── web/        cliente web (Cloudflare Pages en producción)
└── mobile/     app mobile (Expo, ver apps/mobile/README.md)
packages/
├── core/       lógica compartida: cliente HTTP, endpoints y tipos (chat, voz y auth en construcción)
└── tokens/     tokens de diseño compartidos (en construcción)
docs/           ADRs y planes (TODO-REDISENO.md)
```

## Requisitos

- Node 20.19+ (22 recomendado).
- Las dependencias se instalan **una sola vez, desde la raíz**: `npm install`. No correr `npm install`
  adentro de `apps/*`: el monorepo tiene un único `package-lock.json` y una sola copia de React para los dos
  clientes.
- El backend levantado desde el orquestador (`docker compose up -d` en su raíz).

## Web

```bash
cp apps/web/.env.example apps/web/.env   # URL de la API y Auth0
npm run dev                              # http://localhost:5173
npm test                                 # tests de todos los workspaces
npm run typecheck                        # TypeScript de web y mobile
npm run build                            # deja el build en dist/ (raíz)
```

`dist/` queda en la raíz porque ahí lo buscan Cloudflare Pages y el `Dockerfile`.

## Mobile

```bash
npm run mobile        # = expo start --go, desde la raíz
```

El resto (development build, voz, EAS) está en [`apps/mobile/README.md`](apps/mobile/README.md).

## Agregar una dependencia

```bash
npm install <paquete> -w @discordia/web      # o @discordia/mobile, @discordia/core, @discordia/tokens
```

React, React Native y TypeScript tienen que quedar en **una sola versión** para todo el repo (Expo no
soporta copias duplicadas de React en el monorepo): verificarlo con `npm ls react`.

## Docker

`Dockerfile` (producción, nginx) y `Dockerfile.dev` (Vite con recarga) se construyen con la raíz del repo
como contexto e instalan solo las dependencias de la web. Los usa el `docker-compose.yml` del orquestador.
