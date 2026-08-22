# sites

Monorepo con los dos sitios que corren en mi Raspberry Pi 4:

| Sitio                    | Qué es                          | Carpeta               |
| ------------------------ | ------------------------------- | --------------------- |
| **ramiroagustin.online** | Página personal / portfolio     | `apps/ramiroagustin/` |
| **bytefix.shop**         | ByteFix — taller de informática | `apps/bytefix/`       |

Los dos comparten sistema de diseño y componentes, pero tienen identidad
propia: el personal es claro/editorial con toggle de tema; ByteFix es oscuro y
está comprometido con el cian de su marca.

Y un tercer servicio que no es un sitio: **`apps/taller/`**, el sistema interno
de órdenes de servicio con el que se recibe un equipo y se le emite un
comprobante al cliente.

## Stack

- **React 19 + TypeScript** en modo estricto (`noUncheckedIndexedAccess`
  incluido).
- **Vite 6** para build y dev server.
- **CSS Modules** sobre tokens de diseño propios. Sin framework de CSS.
- **Prerender propio** con `react-dom/server`: el HTML de los dos sitios se
  sirve completo, sin proceso de Node en runtime.
- **Fastify + SQLite** en el taller, que sí necesita servidor: es el único.
- **pnpm workspaces** para compartir `packages/ui`, `packages/tokens` y
  `packages/negocio`.
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
  taller/            órdenes de servicio (no es un sitio: ver más abajo)
    src/
      vistas/        páginas del panel, HTML renderado en servidor
      db.ts          esquema de SQLite
    public/          CSS y el JS de la firma
packages/
  tokens/            reset, escalas y breakpoints compartidos
  ui/                Button, Card, Section, Container + hooks
  negocio/           dirección, teléfono y tarifas de ByteFix
```

`packages/negocio` es lo que evita el problema clásico del talonario de papel:
la dirección y los precios que imprime un comprobante salen del mismo módulo
que los que muestra bytefix.shop, así que no pueden quedar desfasados.

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

El taller no tiene paso de build: `pnpm build` solo toca los sitios.

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
- http://localhost:3100 → taller (órdenes de servicio)

Los puertos se publican solo en `127.0.0.1`.

El taller se levanta con el código montado y `--watch`: al guardar un archivo
el proceso se reinicia solo. Los dos sitios sí hay que reconstruirlos, porque
se sirven ya compilados.

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

## Órdenes de servicio

`apps/taller/` es el sistema con el que se recibe un equipo: se cargan los
datos, el cliente firma en la pantalla del celular y se emite un comprobante.
Es el único servicio del repo con un proceso Node en runtime — los dos sitios
siguen siendo nginx y estáticos.

```bash
docker compose up -d --build taller
```

Se publica por el mismo túnel, en su propio subdominio, y va **detrás de
Cloudflare Access**: es un panel de administración, no una página pública. El
subdominio se da de alta en el túnel apuntando a `http://taller:3100`.

También queda escuchando en `127.0.0.1:3100` de la Pi, igual que Umami. Eso es
lo que permite entrar por SSH si el túnel se cae con un cliente esperando:

```bash
ssh -L 3100:localhost:3100 pi@raspberrypi
```

### Qué hace

El circuito está completo: se carga la orden con fotos y firma, se emite el
comprobante en PDF, se manda por correo con el número de orden y el enlace de
seguimiento, se le van cargando novedades y estados, el cliente los sigue desde
bytefix.shop, y las fotos sueltas se borran solas a los 30 días de entregado el
equipo.

Las condiciones que se imprimen al pie del comprobante viven en
`src/condiciones.ts` y repiten lo que bytefix.shop ya publica.

### Puesta en marcha en la Pi

El orden importa, porque la contraseña se genera con el propio contenedor.

1. **Contraseña del panel.** Con `TALLER_PASSWORD_HASH` todavía vacía en el
   `.env`:

   ```bash
   docker compose run --rm taller node --import tsx src/hash.ts
   ```

   La pregunta es interactiva, no muestra lo que se escribe y la pide dos
   veces. Imprime la línea entera lista para pegar en el `.env`. Del hash no se
   vuelve atrás: si se olvida la contraseña, se genera otra.

   Se puede pasar como argumento para scripts, pero por esa vía queda en el
   historial del shell y visible en `ps`.

   Por eso esa variable **no** lleva guarda `${...:?}` en el compose, a
   diferencia de `TUNNEL_TOKEN`: Compose interpola el archivo entero antes de
   ejecutar nada, así que un guarda ahí haría imposible correr el comando que
   genera el hash. La validación está en el arranque del servidor, que sale con
   un mensaje que incluye este mismo comando.

2. **Correo.** `TALLER_SMTP_USUARIO` y `TALLER_SMTP_CLAVE` con una contraseña
   de aplicación de Gmail —no la de la cuenta; requiere el 2FA activado—. Con
   estas vacías el sistema funciona igual: las órdenes quedan marcadas como
   "correo sin configurar" y el PDF se descarga desde el panel.

3. **Levantar.**

   ```bash
   docker compose up -d --build
   ```

4. **Subdominio en el túnel**: `taller.bytefix.shop` → `http://taller:3100`.
   Después completar `TALLER_URL_PUBLICA` y reiniciar, para que el enlace de
   seguimiento entre en los correos.

5. **Cloudflare Access** delante del subdominio, **excluyendo** `/seguimiento`,
   `/s/*` y `/estilos.css`, que son las rutas de los clientes. El resto del
   panel queda detrás.

6. **Publicar el seguimiento en bytefix.shop**: poner la URL en `seguimiento`
   de `packages/negocio/src/site.ts` y reconstruir. Mientras sea `null`, la
   sección no se renderiza.

### Detalles que no son obvios

**Corre TypeScript directo con `tsx`, sin compilar a `dist/`.** Evita el paso
de build y el bundling de los paquetes del workspace. El costo es alrededor de
un segundo de arranque en un proceso que queda levantado durante semanas.

**La imagen es Debian y no Alpine.** `better-sqlite3` publica binarios ya
compilados para linux-arm64 con glibc, pero no para musl: en Alpine, la Pi
tendría que compilarlo desde fuente en cada build.

**Todo lo que se interpola en las vistas se escapa solo.** Las plantillas usan
un tag `html` que escapa cualquier valor que no venga de otra plantilla. Sin
eso, olvidarse un escapado en un solo campo —el nombre de un cliente— alcanza
para inyectar HTML en el panel.

**Prettier tiene el formateo embebido apagado para `src/vistas/`.** Reconoce el
tag `html` como HTML y lo reformatea, pero el resultado no es idempotente:
`--write` seguido de `--check` falla solo y rompe CI.

**El formulario guarda un borrador en `localStorage` mientras se completa.** El
modo de falla más probable del sistema es que suene el teléfono a la mitad de
la carga; al volver, la orden tiene que seguir ahí.

**El número de orden se calcula en hora argentina.** Con UTC, una orden cargada
el 31 de diciembre a las 21:30 quedaría numerada con el año siguiente.

**El POST redirige en vez de responder HTML.** Si no, un refresh del navegador
reenvía el formulario y emite una segunda orden del mismo equipo.

**Las fotos se suben aparte del formulario, apenas se sacan.** Guardar la orden
queda instantáneo aunque tenga cuatro fotos, una señal mala no arruina toda la
carga, y en el borrador entran como un id de 32 caracteres en vez de varios MB.

**El navegador las redimensiona antes de subirlas** a 1600 px de lado mayor y
JPEG de calidad 0.75: una foto de celular pasa de varios MB a ~200 KB. Se usa
`createImageBitmap` con `imageOrientation: "from-image"` porque sin eso las
fotos sacadas en vertical se guardan acostadas.

**Hay dos botones y no uno.** `capture="environment"` abre la cámara directo,
que es lo que se quiere en el mostrador, pero en varios teléfonos impide elegir
una foto ya sacada. El segundo botón es el input sin `capture`.

**`rutaDeFoto` valida el id antes de tocar el disco.** Es lo único que separa
`GET /fotos/:id` de servir cualquier archivo del contenedor.

**El PDF es determinista y su hash se graba una sola vez.** `CreationDate` y
`ModDate` salen de la fecha de la orden, no del reloj: si salieran del reloj,
dos generaciones del mismo comprobante darían bytes distintos y el SHA-256
dejaría de servir para compararlo con la copia del cliente. Por la misma razón
una regeneración no pisa el hash ya guardado.

**Lo que hace verificable al comprobante no es el PDF.** Un PDF se edita en
cualquier lado y la firma dibujada con el dedo es una imagen, no una firma
digital en el sentido de la Ley 25.506. Lo que prueba algo es el registro del
servidor —el hash en la base— más la copia del correo, que queda con fecha en
las dos casillas.

**El comprobante usa las fuentes estándar de PDF, que codifican en cp1252.**
Cubren el español entero, pero un nombre con un emoji haría fallar la emisión:
`limpiar()` descarta lo que no se puede representar en vez de romper.

**Los títulos de sección del PDF se dibujan recién si hay un dato debajo.** Con
casi todos los campos opcionales, un "TRABAJO" solo y vacío es la situación
normal, y se lee como si el comprobante hubiera salido incompleto.

**Si la emisión del PDF falla, la orden igual se guarda.** Perder la carga con
el cliente enfrente es peor que quedarse sin PDF; se regenera al pedirlo desde
el detalle. El correo, por lo mismo, sale en segundo plano con reintentos: si
Gmail está lento, esa espera no se paga con el cliente en el mostrador.

**La clave de firma de las sesiones se deriva del hash de la contraseña.** No
hace falta un secreto más en el `.env`, las sesiones sobreviven a un reinicio,
y cambiar la contraseña cierra todas las sesiones abiertas — que es justo lo
que se quiere si el motivo del cambio es que el teléfono se perdió.

**El enlace de seguimiento lleva un token aleatorio, no el número de orden.**
Los números son correlativos: con `/s/BF-2026-0001`, contar hasta 0002 daría
los datos de otro cliente.

**El seguimiento público muestra deliberadamente poco**: equipo, estado,
novedades y lo presupuestado. Nada de DNI, correo, teléfono ni fotos. El token
es impredecible, pero un enlace se reenvía por WhatsApp sin pensarlo.

**Buscar una orden que no existe y acertar el número con el teléfono
equivocado dan el mismo error.** Con dos mensajes distintos, probar números
diría cuáles existen.

**El número de orden se entrega por dos vías, no una.** Va en el asunto y en
el cuerpo del correo —en un recuadro propio, porque es el dato que el cliente
va a volver a buscar dentro de tres semanas—, y además hay un botón que lo
manda por WhatsApp con el cliente todavía enfrente. Si el correo cae en spam o
la dirección quedó mal tipeada, el WhatsApp llegó igual.

**El aviso de "está listo" va por WhatsApp, no por correo.** Todo bytefix.shop
empuja a ese canal y es por donde la gente contesta. El botón del detalle abre
WhatsApp con el mensaje y el enlace ya escritos.

**El reloj de los 30 días arranca en "entregada", no en "lista para
retirar".** Un equipo puede quedar listo y retirarse tres semanas después;
borrar las fotos mientras todavía puede haber un reclamo sería al revés. Y el
equipo que nunca se retira conserva sus fotos para siempre, que es el caso en
que más hacen falta.

**El borrado de fotos tiene dos guardas y ninguna es opcional.** Solo se
borran si el comprobante se envió por correo y si el PDF está en el disco. Si
el correo no salió, las fotos no están en ninguna otra parte; si falta el PDF,
borrarlas las perdería del sistema por completo y el comprobante se regeneraría
sin ellas. No borrar cuesta unos MB; borrar de más no se deshace.

**Las filas de `fotos` no se borran, solo los archivos.** Son el registro de
cuántas hubo, y permiten que el detalle diga "se borró el tal día" en vez de
mostrar imágenes rotas.

**La limpieza corre adentro del proceso, no en un contenedor de cron.** La
decisión se toma comparando fechas, no midiendo tiempo transcurrido: que la Pi
haya estado apagada una semana no saltea ninguna pasada.

**Las fotos huérfanas esperan 24 horas.** Una foto subida en una orden que se
abandonó a la mitad queda sin ninguna fila que la referencie; el margen evita
llevarse por delante una carga en curso.

**`trustProxy` está activado.** Detrás de Cloudflare, sin eso todos los
intentos de login vendrían de la IP del túnel y el freno de fuerza bruta
bloquearía a Ramiro junto con todos los demás.

**Solo los datos del cliente son obligatorios.** Cualquier otro campo exigido
es un segundo de más con la persona esperando enfrente, y el sistema que tarda
es el que no se usa.

## Analítica

Umami autohospedado en la misma Pi: sin cookies, sin datos personales y sin
enviar nada a terceros. Los datos quedan en un volumen de Docker.

Es opcional de punta a punta. Con las variables de analítica vacías, los
sitios se compilan sin ningún script de terceros y no hace falta levantar
nada de esto.

Vive en `compose.analytics.yml`, separado del principal: Compose interpola el
archivo entero antes de elegir qué servicios levantar, así que tener acá los
requisitos de Umami rompería el despliegue de los sitios en cualquier
instalación sin analítica.

### Puesta en marcha

El orden importa: los IDs de sitio no existen hasta que Umami esté corriendo,
así que se arranca con ellos vacíos y se completa después.

1. **Secretos.** Generarlos y agregarlos al `.env`:

   ```bash
   openssl rand -base64 32   # UMAMI_DB_PASSWORD
   openssl rand -base64 32   # UMAMI_APP_SECRET
   ```

   `ANALYTICS_ID_RAMIROAGUSTIN` y `ANALYTICS_ID_BYTEFIX` quedan **vacías** por
   ahora.

2. **Levantar Umami**, todavía sin exponerlo:

   ```bash
   docker compose -f docker-compose.yml -f compose.analytics.yml up -d
   ```

3. **Cambiar la contraseña inicial antes de publicar nada.** Umami arranca con
   `admin` / `umami`; si el subdominio se publica antes de este paso, cualquiera
   que dé con la URL entra. El servicio escucha en `127.0.0.1:3000` de la Pi:

   ```bash
   ssh -L 3000:localhost:3000 pi@raspberrypi
   ```

   y abrir `http://localhost:3000`. Settings → Profile → cambiar contraseña.

4. **Publicar el subdominio** en el túnel de Cloudflare:
   `analytics.ramiroagustin.online` → `http://umami:3000`.

5. **Dar de alta los sitios.** Settings → Websites → Add website, uno por cada
   dominio. Copiar el _Website ID_ de cada uno a `ANALYTICS_ID_RAMIROAGUSTIN` y
   `ANALYTICS_ID_BYTEFIX` en el `.env`.

6. **Reconstruir los sitios** para que el script quede inyectado:

   ```bash
   docker compose -f docker-compose.yml -f compose.analytics.yml up -d --build
   ```

El ID se inyecta **en tiempo de build**, no en runtime: por eso hace falta
reconstruir. A cambio el HTML sale con el script ya puesto y no hay que
resolver nada del lado del cliente. A partir de acá, los `up` de todos los días
incluyen los dos archivos.

Si se cambia el subdominio, hay que actualizarlo en tres lugares:
`VITE_ANALYTICS_SRC` del `.env`, el hostname del túnel, y las directivas
`script-src` y `connect-src` de los dos `apps/*/nginx.conf` — la CSP bloquea
cualquier origen que no esté declarado.

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
