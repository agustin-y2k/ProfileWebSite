# ─── Etapa 1: build ──────────────────────────────────────────────────────────
# Compila dentro del contenedor: ni la Raspberry ni la máquina de desarrollo
# necesitan tener Node instalado.
FROM node:22-alpine AS build

ARG APP
WORKDIR /repo

RUN corepack enable

# Se copian solo los manifiestos primero: mientras no cambien las dependencias,
# Docker reutiliza la capa de install y el build baja de minutos a segundos.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/tokens/package.json packages/tokens/
COPY packages/ui/package.json packages/ui/
COPY apps/${APP}/package.json apps/${APP}/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/${APP}/ apps/${APP}/

# Analítica: si no se pasan, el plugin de Vite no inyecta nada y el sitio se
# compila sin script de terceros. Son públicas por naturaleza —terminan en el
# HTML—, así que no hay secreto que proteger acá.
ARG VITE_ANALYTICS_SRC=""
ARG VITE_ANALYTICS_ID=""
ENV VITE_ANALYTICS_SRC=$VITE_ANALYTICS_SRC
ENV VITE_ANALYTICS_ID=$VITE_ANALYTICS_ID

RUN pnpm --filter ./apps/${APP} build

# ─── Etapa 2: runtime ────────────────────────────────────────────────────────
# La imagen final solo lleva nginx y los estáticos: sin Node, sin node_modules,
# sin código fuente. Igual de liviana que la que corre hoy en la Pi.
FROM nginx:alpine AS runtime

ARG APP
COPY --from=build /repo/apps/${APP}/dist /usr/share/nginx/html
COPY apps/${APP}/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# 127.0.0.1 y no `localhost`: dentro del contenedor `localhost` resuelve
# primero a ::1, y nginx con `listen 80` solo escucha en IPv4. Apuntar a
# localhost deja el healthcheck en "connection refused" para siempre — y como
# cloudflared depende de `service_healthy`, el túnel nunca levantaría.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
