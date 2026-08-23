import { tarifaDe } from "@sites/negocio";
import { html, type Html } from "../html";
import { comoFechaHora } from "../fecha";
import { config } from "../config";
import { ESTADOS, accesoriosDe, fotosDe, type Evento, type Orden } from "../ordenes";
import { enlaceWhatsapp } from "../whatsapp";
import { layout } from "./layout";

function fila(etiqueta: string, valor: string | null | undefined): Html | string {
  if (!valor) return "";
  return html`
    <div class="fila">
      <dt>${etiqueta}</dt>
      <dd>${valor}</dd>
    </div>
  `;
}

const TEXTO_ENVIO: Record<string, string> = {
  pendiente: "Enviando el comprobante…",
  enviado: "Comprobante enviado por correo",
  error: "No se pudo enviar el comprobante",
  "sin configurar": "Correo sin configurar: el comprobante no se envió",
};

export function vistaDetalle(
  orden: Orden,
  eventos: Evento[],
  recienCreada: boolean,
): string {
  const accesorios = accesoriosDe(orden);
  const fotos = fotosDe(orden);
  const servicio = orden.servicio_id ? tarifaDe(orden.servicio_id) : undefined;

  const equipo = [orden.equipo_tipo, orden.marca, orden.modelo].filter(Boolean).join(" ");
  const enlacePublico = config.urlPublica
    ? `${config.urlPublica}/s/${orden.token}`
    : null;

  // Entrega del número en el momento, por el canal que el cliente sí mira. El
  // correo puede caer en spam, tener la dirección mal tipeada o simplemente no
  // leerse; un WhatsApp mandado con el cliente enfrente, no.
  const mandarNumero = enlaceWhatsapp(
    orden.cliente_telefono,
    [
      `Hola ${orden.cliente_nombre.split(" ")[0] ?? ""}, recibimos tu ${equipo || "equipo"}.`,
      `Tu número de orden es ${orden.numero}.`,
      enlacePublico ? `Podés seguir cómo va acá: ${enlacePublico}` : "",
      "Te mandamos el comprobante por correo también.",
    ]
      .filter(Boolean)
      .join(" "),
  );

  const avisoListo = enlaceWhatsapp(
    orden.cliente_telefono,
    [
      `Hola ${orden.cliente_nombre.split(" ")[0] ?? ""}, tu ${equipo || "equipo"} ya está listo para retirar.`,
      `Orden ${orden.numero}.`,
      enlacePublico ? `Podés ver el detalle acá: ${enlacePublico}` : "",
    ]
      .filter(Boolean)
      .join(" "),
  );

  const contenido = html`
    ${
      recienCreada
        ? html`<p class="aviso-ok" role="status">
          Orden guardada. Mandale el número por WhatsApp antes de que se vaya.
        </p>`
        : ""
    }

    <h1 class="numero-grande">${orden.numero}</h1>
    <p class="subtitulo">
      <span class="estado" data-estado="${orden.estado}">${orden.estado}</span>
      · recibida el ${comoFechaHora(orden.creada_en)}
    </p>

    <div class="acciones">
      ${
        mandarNumero
          ? html`
              <a class="whatsapp" href="${mandarNumero}" target="_blank" rel="noopener">
                Mandarle el número por WhatsApp
              </a>
            `
          : html`<p class="ayuda">
              No se pudo armar un enlace de WhatsApp con ese teléfono.
            </p>`
      }
      <a class="principal enlace-boton" href="/ordenes/${orden.numero}/comprobante.pdf">
        Ver comprobante en PDF
      </a>
    </div>

    <!-- ── Estado del envío ─────────────────────────────────────────────── -->
    <section class="envio" data-envio="${orden.email_estado}">
      <p>
        ${TEXTO_ENVIO[orden.email_estado] ?? orden.email_estado}
        ${orden.email_enviado_en ? html` · ${comoFechaHora(orden.email_enviado_en)}` : ""}
      </p>
      ${orden.email_error ? html`<p class="ayuda">${orden.email_error}</p>` : ""}
      ${
        orden.email_estado !== "enviado"
          ? html`
            <form method="post" action="/ordenes/${orden.numero}/reenviar">
              <button type="submit" class="secundario">Reenviar comprobante</button>
            </form>
          `
          : ""
      }
    </section>

    <!-- ── Novedades ────────────────────────────────────────────────────── -->
    <section class="novedades">
      <h2>Agregar novedad</h2>
      <form method="post" action="/ordenes/${orden.numero}/eventos">
        <label for="estado">Estado</label>
        <select id="estado" name="estado">
          ${ESTADOS.map(
            (estado) => html`
              <option value="${estado}" ${estado === orden.estado ? "selected" : ""}>
                ${estado}
              </option>
            `,
          )}
        </select>

        <label for="nota">
          Diagnóstico o novedad <span class="opt">la ve el cliente</span>
        </label>
        <textarea
          id="nota"
          name="nota"
          rows="3"
        ></textarea>

        <button type="submit" class="principal">Guardar novedad</button>
      </form>

      ${
        avisoListo
          ? html`
            <a class="whatsapp" href="${avisoListo}" target="_blank" rel="noopener">
              Avisar por WhatsApp que está listo
            </a>
          `
          : ""
      }
    </section>

    <section class="linea-tiempo">
      <h2>Historial</h2>
      <ol>
        ${eventos.map(
          (evento) => html`
            <li>
              <span class="momento">${comoFechaHora(evento.creado_en)}</span>
              <span class="hito">${evento.estado}</span>
              ${evento.nota ? html`<p class="nota">${evento.nota}</p>` : ""}
            </li>
          `,
        )}
      </ol>
    </section>

    <dl class="ficha">
      ${fila("Cliente", orden.cliente_nombre)} ${fila("Teléfono", orden.cliente_telefono)}
      ${fila("Correo", orden.cliente_email)} ${fila("DNI", orden.cliente_dni)}
      ${fila("Equipo", equipo)} ${fila("Serie", orden.serie)}
      ${fila("Se recibió con", accesorios.join(", "))} ${fila("Enciende", orden.enciende)}
      ${fila("Estado al recibirlo", orden.observaciones)}
      ${fila("Servicio", servicio?.service)} ${fila("Falla reportada", orden.falla)}
      ${fila("Presupuesto", orden.presupuesto)} ${fila("Plazo", orden.plazo)}
      ${fila("Entregada", orden.entregada_en ? comoFechaHora(orden.entregada_en) : null)}
    </dl>

    ${
      orden.fotos_borradas_en
        ? html`
            <section class="bloque-fotos">
              <h2>Fotos al recibirlo</h2>
              <p class="ayuda">
                ${
                  fotos.length === 1
                    ? "La foto se borró"
                    : `Las ${fotos.length} fotos se borraron`
                }
                del disco el ${comoFechaHora(orden.fotos_borradas_en)}, a los
                ${config.diasDeFotos} días de entregado el equipo. Siguen dentro del
                comprobante en PDF.
              </p>
            </section>
          `
        : fotos.length > 0
          ? html`
          <section class="bloque-fotos">
            <h2>Fotos al recibirlo</h2>
            <ul class="fotos-lista">
              ${fotos.map(
                (id) => html`
                  <li>
                    <a href="/fotos/${id}" target="_blank" rel="noopener">
                      <img src="/fotos/${id}" alt="Foto del equipo al recibirlo" />
                    </a>
                  </li>
                `,
              )}
            </ul>
          </section>
        `
          : ""
    }
    ${
      orden.firma_png
        ? html`
          <section class="bloque-firma">
            <h2>Firma del cliente</h2>
            <img src="/ordenes/${orden.numero}/firma.png" alt="Firma del cliente" />
            <p class="ayuda">
              Firmada el ${orden.firmada_en ? comoFechaHora(orden.firmada_en) : ""}
            </p>
          </section>
        `
        : html`<p class="ayuda">Esta orden se recibió sin firma en pantalla.</p>`
    }
    ${
      enlacePublico
        ? html`
          <section class="huella">
            <h2>Enlace de seguimiento</h2>
            <p class="ayuda">El que va en el correo del cliente.</p>
            <code>${enlacePublico}</code>
          </section>
        `
        : ""
    }
    ${
      orden.pdf_sha256
        ? html`
          <section class="huella">
            <h2>Huella del comprobante</h2>
            <p class="ayuda">
              SHA-256 del PDF emitido. Es lo que permite comprobar que una copia
              no fue modificada después.
            </p>
            <code>${orden.pdf_sha256}</code>
          </section>
        `
        : ""
    }
  `;

  return layout({ titulo: "Orden", volver: "/", contenido });
}
