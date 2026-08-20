# sites

Monorepo con los dos sitios que corren en mi Raspberry Pi 4:

| Sitio                  | Qué es                          | Carpeta               |
| ---------------------- | ------------------------------- | --------------------- |
| **ramiroagustin.site** | Página personal / portfolio     | `apps/ramiroagustin/` |
| **bytefix.shop**       | ByteFix — taller de informática | `apps/bytefix/`       |

Los dos comparten sistema de diseño y componentes, pero tienen identidad
propia: el personal es claro/editorial con toggle de tema; ByteFix es oscuro y
está comprometido con el cian de su marca.

## Stack

- **React 19 + TypeScript** en modo estricto (`noUncheckedIndexedAccess`
  incluido).
- **Vite 6** para build y dev server.
- **CSS Modules** sobre tokens de diseño propios. Sin framework de CSS.
- **Prerender propio** con `react-dom/server`: el HTML se sirve completo, sin
  proceso de Node en runtime.
- **pnpm workspaces** para compartir `packages/ui` y `packages/tokens`.
- **Docker multi-stage** → la imagen final es nginx + estáticos, sin Node.
- **Cloudflare Tunnel** para publicar sin abrir puertos.

## Estructura

```
apps/
  ramiroagustin/     sitio personal
  bytefix/           sitio comercial
    src/
      components/    piezas propias del sitio
      sections/      cada bloque de la página
      data/          textos, servicios, tarifas (una sola fuente de verdad)
      styles/        tema y tipografías del sitio
    scripts/         prerender
    Dockerfile       build + runtime
    nginx.conf       caché, compresión y cabeceras
packages/
  tokens/            reset, escalas y breakpoints compartidos
  ui/                Button, Card, Section, Container + hooks
```

Los tokens compartidos son de **ritmo** (espaciado, tipografía, radios,
motion), no de color. El color vive en el `theme.css` de cada app: es lo que
permite que los dos sitios se sientan hermanos sin ser el mismo sitio.

## Desarrollo

Requiere Node 20+ y pnpm (o solo Docker, ver más abajo).

```bash
pnpm install

pnpm dev:ramiro       # http://localhost:5173
pnpm dev:bytefix      # http://localhost:5173

pnpm typecheck        # tsc en todos los paquetes
pnpm lint             # eslint
pnpm build            # compila los dos sitios a apps/*/dist
```

### Sin Node instalado

Todo se puede hacer dentro de un contenedor:

```bash
docker run --rm -v "$PWD":/repo -w /repo -u "$(id -u):$(id -g)" \
  -e HOME=/tmp -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 node:22-alpine \
  sh -c 'mkdir -p /tmp/bin && corepack enable --install-directory /tmp/bin \
         && export PATH=/tmp/bin:$PATH && pnpm install && pnpm build'
```

## Vista previa local

Levanta los dos sitios ya compilados, sin túnel:

```bash
docker compose -f compose.local.yml up --build
```

- http://localhost:8091 → ramiroagustin
- http://localhost:8092 → bytefix

Los puertos se publican solo en `127.0.0.1`.

## Despliegue en la Raspberry

```bash
cp .env.example .env      # completar TUNNEL_TOKEN
docker compose up -d --build
```

El build corre dentro del contenedor, así que la Pi no necesita Node. La imagen
final solo tiene nginx y los archivos estáticos (~95 MB, casi todo la base
`nginx:alpine`).

Para actualizar después de un cambio:

```bash
git pull && docker compose up -d --build
```

## Detalles que no son obvios

**El prerender es lo que sostiene el SEO.** `vite build` deja un
`<div id="root">` vacío; `scripts/prerender.mjs` renderiza la app con
`react-dom/server` y la inyecta en el HTML. Si ese paso falla, el sitio sigue
funcionando para personas pero desaparece para los buscadores — por eso CI lo
verifica explícitamente.

**Las clases de CSS Modules tienen nombre fijo.** El build de cliente y el de
SSR son dos procesos distintos; sin `generateScopedName` explícito podrían
generar hashes distintos y la hidratación fallaría.

**El año del footer se congela en el build.** Calcularlo en runtime haría que
el HTML prerenderizado y el cliente difieran si el año cambió entremedio.

**Las animaciones de entrada dependen de `html.js`.** Un script inline agrega
esa clase; el CSS que oculta los bloques vive detrás de ella. Sin JS, la página
se lee completa en lugar de quedar en blanco.

**El fondo va en una capa `position: fixed`, no en `background-attachment`.**
Esa propiedad fuerza un repintado completo por frame de scroll, y iOS Safari
directamente la ignora.
