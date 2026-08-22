import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Fastify from "fastify";
import formbody from "@fastify/formbody";
import estaticos from "@fastify/static";
import { config, correoConfigurado } from "./config";
import {
  COOKIE,
  armarCookie,
  bloqueado,
  contrasenaValida,
  crearSesion,
  leerCookie,
  limpiarIntentos,
  registrarFallo,
  sesionValida,
} from "./auth";
import { layout } from "./vistas/layout";
import { html } from "./html";
import { vistaLista } from "./vistas/lista";
import { vistaNueva } from "./vistas/nueva";
import { vistaDetalle } from "./vistas/detalle";
import { vistaEntrar } from "./vistas/entrar";
import { vistaBuscarSeguimiento, vistaSeguimiento } from "./vistas/seguimiento";
import { FOTO_MAX_BYTES, guardarFoto, rutaDeFoto } from "./fotos";
import { asegurarComprobante, emitirComprobante } from "./comprobante";
import { encolarComprobante } from "./correo";
import { programarLimpieza } from "./limpieza";
import {
  ORDEN_VACIA,
  agregarEvento,
  buscarParaSeguimiento,
  buscarPorNumero,
  buscarPorToken,
  crearOrden,
  ordenesDelTelefono,
  esEstado,
  eventosDe,
  leerFormulario,
  ultimasOrdenes,
  validar,
} from "./ordenes";

const aqui = dirname(fileURLToPath(import.meta.url));

// Fallar al arrancar y no al primer request: un panel que se publica sin
// contraseña porque faltó una variable es peor que un contenedor que no
// levanta y se ve en `docker compose ps`.
if (config.autenticar && !config.contrasenaHash) {
  console.error(
    [
      "Falta TALLER_PASSWORD_HASH.",
      "",
      "Generarlo con:",
      "  docker compose run --rm taller node --import tsx src/hash.ts",
      "",
      "y ponerlo en el .env. Para correr sin contraseña —solo con el puerto",
      "atado a 127.0.0.1— usar TALLER_AUTH=off.",
    ].join("\n"),
  );
  process.exit(1);
}

const app = Fastify({
  logger: { level: process.env["TALLER_LOG"] ?? "info" },
  // La firma viaja como data URL adentro del formulario; las fotos no, van por
  // su propia ruta. Con eso, el cuerpo del formulario no pasa de unos cientos
  // de KB por más fotos que tenga la orden.
  bodyLimit: 2 * 1024 * 1024,
  // Detrás de Cloudflare, la IP del cliente y el protocolo llegan en cabeceras
  // `X-Forwarded-*`. Sin esto, todos los intentos de login vendrían de la IP
  // del túnel y el freno de fuerza bruta bloquearía a Ramiro junto con todos.
  trustProxy: true,
});

await app.register(formbody);
await app.register(estaticos, {
  root: resolve(aqui, "..", "public"),
  prefix: "/",
  cacheControl: true,
  maxAge: 0,
});

// Las fotos llegan como JPEG crudo desde `fetch`, sin multipart: el navegador
// ya las redimensionó, así que es un solo archivo por request y no hace falta
// parsear un formulario de varias partes.
app.addContentTypeParser(
  "image/jpeg",
  { parseAs: "buffer" },
  (_peticion, cuerpo, listo) => listo(null, cuerpo),
);

function pagina(reply: { type: (t: string) => unknown }, cuerpo: string): string {
  reply.type("text/html; charset=utf-8");
  return cuerpo;
}

// ── Acceso ──────────────────────────────────────────────────────────────────
//
// Todo el panel pide sesión. Quedan fuera el healthcheck, la pantalla de login
// y el seguimiento público —que es para los clientes, no para Ramiro—, más el
// CSS y el JS, que los necesita justamente la pantalla de login.
const PUBLICAS = ["/salud", "/entrar", "/seguimiento"];

function esPublica(url: string): boolean {
  const ruta = url.split("?")[0] ?? "";
  if (PUBLICAS.includes(ruta)) return true;
  if (ruta.startsWith("/s/")) return true;
  return ruta.endsWith(".css") || ruta.endsWith(".js");
}

app.addHook("onRequest", async (peticion, reply) => {
  if (!config.autenticar || esPublica(peticion.url)) return;
  if (sesionValida(leerCookie(peticion.headers.cookie, COOKIE))) return;

  reply.status(302).header("Location", "/entrar").send();
});

const esHttps = (protocolo: string) => protocolo === "https";

app.get("/entrar", async (peticion, reply) => {
  if (!config.autenticar) return reply.redirect("/", 302);
  if (sesionValida(leerCookie(peticion.headers.cookie, COOKIE))) {
    return reply.redirect("/", 302);
  }
  return pagina(reply, vistaEntrar());
});

app.post("/entrar", async (peticion, reply) => {
  const { contrasena } = (peticion.body ?? {}) as { contrasena?: string };

  if (bloqueado(peticion.ip)) {
    reply.status(429);
    return pagina(reply, vistaEntrar("Demasiados intentos. Probá de nuevo en un rato."));
  }

  if (typeof contrasena !== "string" || !contrasenaValida(contrasena)) {
    registrarFallo(peticion.ip);
    peticion.log.warn({ ip: peticion.ip }, "intento de acceso fallido");
    reply.status(401);
    return pagina(reply, vistaEntrar("Contraseña incorrecta."));
  }

  limpiarIntentos(peticion.ip);
  return reply
    .header(
      "Set-Cookie",
      armarCookie(crearSesion(), esHttps(peticion.protocol), 30 * 24 * 60 * 60),
    )
    .redirect("/", 303);
});

app.post("/salir", async (peticion, reply) => {
  return reply
    .header("Set-Cookie", armarCookie("", esHttps(peticion.protocol), 0))
    .redirect("/entrar", 303);
});

app.get("/salud", async () => ({ ok: true }));

// ── Panel ───────────────────────────────────────────────────────────────────

app.get("/", async (peticion, reply) => {
  const { creada } = peticion.query as { creada?: string };
  return pagina(reply, vistaLista(ultimasOrdenes(), creada));
});

app.get("/nueva", async (_peticion, reply) => {
  return pagina(reply, vistaNueva({ datos: ORDEN_VACIA, errores: {} }));
});

app.post("/ordenes", async (peticion, reply) => {
  const datos = leerFormulario((peticion.body ?? {}) as Record<string, unknown>);
  const errores = validar(datos);

  if (Object.keys(errores).length > 0) {
    // Se vuelve a dibujar el formulario con todo lo cargado. Perder los datos
    // por un correo mal tipeado significa volver a preguntarle todo al cliente.
    reply.status(400);
    return pagina(reply, vistaNueva({ datos, errores }));
  }

  const numero = crearOrden(datos);
  peticion.log.info({ numero }, "orden creada");

  // El comprobante se emite acá, pero un fallo no cancela la orden: quedarse
  // sin PDF es molesto, perder la carga con el cliente enfrente es peor. Si
  // falla, se regenera al pedirlo desde el detalle.
  const orden = buscarPorNumero(numero);
  if (orden) {
    try {
      await emitirComprobante(orden);
    } catch (error) {
      peticion.log.error({ numero, error }, "no se pudo emitir el comprobante");
    }
    // El correo sale en segundo plano: si Gmail está lento, no se paga esa
    // espera con el cliente parado en el mostrador.
    encolarComprobante(numero, (mensaje, extra) =>
      peticion.log.info(extra ?? {}, mensaje),
    );
  }

  // Redirección después del POST: si no, un refresh del navegador vuelve a
  // enviar el formulario y emite una segunda orden del mismo equipo.
  return reply.redirect(`/ordenes/${numero}?nueva=1`, 303);
});

app.get("/ordenes/:numero", async (peticion, reply) => {
  const { numero } = peticion.params as { numero: string };
  const orden = buscarPorNumero(numero);
  if (!orden) return reply.callNotFound();

  const { nueva } = peticion.query as { nueva?: string };
  return pagina(reply, vistaDetalle(orden, eventosDe(orden.id), nueva === "1"));
});

app.post("/ordenes/:numero/eventos", async (peticion, reply) => {
  const { numero } = peticion.params as { numero: string };
  const orden = buscarPorNumero(numero);
  if (!orden) return reply.callNotFound();

  const { estado, nota } = (peticion.body ?? {}) as { estado?: string; nota?: string };
  if (typeof estado !== "string" || !esEstado(estado)) {
    return reply.status(400).send({ error: "Estado desconocido." });
  }

  agregarEvento(orden.id, estado, typeof nota === "string" ? nota.trim() : "");
  peticion.log.info({ numero, estado }, "novedad agregada");

  return reply.redirect(`/ordenes/${numero}`, 303);
});

app.post("/ordenes/:numero/reenviar", async (peticion, reply) => {
  const { numero } = peticion.params as { numero: string };
  if (!buscarPorNumero(numero)) return reply.callNotFound();

  encolarComprobante(numero, (mensaje, extra) => peticion.log.info(extra ?? {}, mensaje));
  return reply.redirect(`/ordenes/${numero}`, 303);
});

app.post("/fotos", { bodyLimit: FOTO_MAX_BYTES }, async (peticion, reply) => {
  if (!Buffer.isBuffer(peticion.body)) {
    return reply.status(415).send({ error: "Se esperaba una imagen JPEG." });
  }

  const id = guardarFoto(peticion.body);
  peticion.log.info({ id, bytes: peticion.body.length }, "foto subida");
  return reply.status(201).send({ id });
});

app.get("/fotos/:id", async (peticion, reply) => {
  const { id } = peticion.params as { id: string };
  // `rutaDeFoto` valida el formato del id antes de tocar el disco: sin eso, un
  // id con `../` leería cualquier archivo del contenedor.
  const ruta = rutaDeFoto(id);
  if (!ruta) return reply.callNotFound();

  return reply
    .type("image/jpeg")
    .header("Cache-Control", "private, max-age=3600")
    .send(createReadStream(ruta));
});

app.get("/ordenes/:numero/comprobante.pdf", async (peticion, reply) => {
  const { numero } = peticion.params as { numero: string };
  const ruta = await asegurarComprobante(numero);
  if (!ruta) return reply.callNotFound();

  return (
    reply
      .type("application/pdf")
      // `inline`: en el celular se abre en el visor en vez de bajarse a una
      // carpeta de descargas donde nadie lo vuelve a encontrar.
      .header("Content-Disposition", `inline; filename="${numero}.pdf"`)
      .header("Cache-Control", "private, no-store")
      .send(createReadStream(ruta))
  );
});

app.get("/ordenes/:numero/firma.png", async (peticion, reply) => {
  const { numero } = peticion.params as { numero: string };
  const orden = buscarPorNumero(numero);
  if (!orden?.firma_png) return reply.callNotFound();

  return reply
    .type("image/png")
    .header("Cache-Control", "private, no-store")
    .send(orden.firma_png);
});

// ── Seguimiento público ─────────────────────────────────────────────────────

app.get("/s/:token", async (peticion, reply) => {
  const { token } = peticion.params as { token: string };
  const orden = buscarPorToken(token);
  if (!orden) return reply.callNotFound();

  // Todas las órdenes del mismo teléfono. Quien llega hasta acá ya probó ser
  // el dueño —con el token del correo o con número más teléfono—, así que ver
  // su propio historial no expone nada nuevo.
  const otras = ordenesDelTelefono(orden.cliente_telefono).filter(
    (previa) => previa.id !== orden.id,
  );

  return pagina(reply, vistaSeguimiento(orden, eventosDe(orden.id), otras));
});

app.get("/seguimiento", async (_peticion, reply) => {
  return pagina(reply, vistaBuscarSeguimiento({}));
});

app.post("/seguimiento", async (peticion, reply) => {
  const { numero, telefono } = (peticion.body ?? {}) as {
    numero?: string;
    telefono?: string;
  };

  const orden =
    typeof numero === "string" && typeof telefono === "string"
      ? buscarParaSeguimiento(numero, telefono)
      : undefined;

  if (!orden) {
    // Un solo mensaje para "no existe" y para "el teléfono no coincide": con
    // dos mensajes distintos, probar números de orden diría cuáles existen.
    reply.status(404);
    return pagina(
      reply,
      vistaBuscarSeguimiento({
        numero: typeof numero === "string" ? numero : "",
        telefono: typeof telefono === "string" ? telefono : "",
        error: "No encontramos una orden con esos datos. Revisá el número y el teléfono.",
      }),
    );
  }

  return reply.redirect(`/s/${orden.token}`, 303);
});

app.setNotFoundHandler(async (_peticion, reply) => {
  reply.status(404);
  return pagina(
    reply,
    layout({
      titulo: "No encontrado",
      contenido: html`<p class="vacio">Esa página no existe.</p>`,
    }),
  );
});

app.listen({ port: config.puerto, host: config.host }).then(() => {
  if (!config.autenticar) {
    app.log.warn(
      "TALLER_AUTH=off — el panel está SIN contraseña. Solo es aceptable con el puerto atado a 127.0.0.1.",
    );
  }
  if (!correoConfigurado) {
    app.log.warn(
      "SMTP sin configurar — los comprobantes no se envían por correo. Ver TALLER_SMTP_* en el .env.",
    );
  }

  programarLimpieza((mensaje, datos) => app.log.info(datos ?? {}, mensaje));
});
