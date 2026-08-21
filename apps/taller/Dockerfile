# ─────────────────────────────────────────────────────────────────────────────
# Sistema de órdenes de servicio.
#
# A diferencia de los dos sitios, este sí necesita un proceso Node en runtime:
# hay base de datos, formularios y envío de correo. Los sitios siguen siendo
# nginx + estáticos; esto es un servicio aparte que comparte el mismo túnel.
#
# Base Debian y no Alpine a propósito: better-sqlite3 publica binarios ya
# compilados para linux-arm64 con glibc, pero no para musl. En Alpine, la
# Raspberry tendría que compilarlo desde fuente en cada build.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim

WORKDIR /repo
RUN corepack enable

# Los manifiestos primero: mientras no cambien las dependencias, Docker
# reutiliza la capa de install.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/tokens/package.json packages/tokens/
COPY packages/ui/package.json packages/ui/
COPY packages/negocio/package.json packages/negocio/
COPY apps/ramiroagustin/package.json apps/ramiroagustin/
COPY apps/bytefix/package.json apps/bytefix/
COPY apps/taller/package.json apps/taller/

# `@sites/taller...` trae también sus dependencias del workspace (negocio) y
# nada de React ni Vite, que solo usan los sitios.
RUN pnpm install --frozen-lockfile --filter "@sites/taller..." --prod

COPY tsconfig.base.json ./
COPY packages/negocio/ packages/negocio/
COPY apps/taller/ apps/taller/

WORKDIR /repo/apps/taller

ENV NODE_ENV=production
ENV TALLER_DATOS=/datos
EXPOSE 3100

# Node 22 trae `fetch` global, así que el healthcheck no necesita curl ni wget
# —que la imagen slim no incluye— ni instalarlos solo para esto.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD \
  node -e "fetch('http://127.0.0.1:3100/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Se ejecuta el TypeScript directamente con tsx en vez de compilar a dist/.
# Evita el paso de build y el bundling de las dependencias del workspace; el
# costo es aproximadamente un segundo de arranque, en un proceso que queda
# levantado durante semanas.
CMD ["node", "--import", "tsx", "src/server.ts"]
