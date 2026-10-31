FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_API_URL

ENV VITE_API_URL=$VITE_API_URL

# Monorepo (npm workspaces): npm ci valida el lockfile contra el package.json de cada workspace, pero solo
# instala las dependencias de la web y de los paquetes compartidos (no las de mobile ni las del backoffice)
COPY package.json package-lock.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY apps/backoffice/package.json apps/backoffice/
COPY packages/core/package.json packages/core/
COPY packages/tokens/package.json packages/tokens/
RUN npm ci --workspace=@discordia/web --include-workspace-root

COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages packages
# Deja el build en /app/dist (ver apps/web/vite.config.ts)
RUN npm run build

FROM nginx:alpine AS runner

WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

COPY --from=builder /app/dist .

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/livez > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
