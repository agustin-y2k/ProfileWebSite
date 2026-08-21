import { site } from "@sites/negocio";
import { html } from "../html";
import { comoFechaHora } from "../fecha";
import type { Evento, Orden } from "../ordenes";
import { layout } from "./layout";

/** Formulario para quien perdió el correo con el enlace. */
export function vistaBuscarSeguimiento(datos: {
  numero?: string;
  telefono?: string;
  error?: string;
}): string {
  const contenido = html`
    <form method="post" action="/seguimiento" class="entrar">
      <h1 class="titulo-publico">Seguí tu reparación</h1>
      <p class="ayuda">
        Ingresá el número de orden que te llegó por correo —tiene la forma
        BF-año-número— y el teléfono con el que dejaste el equipo.
      </p>

      ${datos.error ? html`<p class="aviso-error" role="alert">${datos.error}</p>` : ""}

      <label for="numero">Número de orden</label>
      <input
        id="numero"
        name="numero"
        value="${datos.numero ?? ""}"
        autocapitalize="characters"
        spellcheck="false"
        required
      />

      <label for="telefono">Teléfono</label>
      <input
        id="telefono"
        name="telefono"
        type="tel"
        inputmode="tel"
        value="${datos.telefono ?? ""}"
        required
      />

      <button type="submit" class="principal">Ver estado</button>

      <p class="ayuda centrado">
        ¿Dudas? Escribinos por
        <a href="${site.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>.
      </p>
    </form>
  `;

  return layout({ titulo: "Seguimiento", contenido });
}

/**
 * Vista pública del estado de una orden.
 *
 * Muestra deliberadamente poco: equipo, estado, novedades y lo presupuestado.
 * Nada de DNI, correo, teléfono ni fotos. El enlace lleva un token
 * impredecible, pero un enlace se reenvía por WhatsApp sin pensarlo y termina
 * en cualquier lado.
 */
export function vistaSeguimiento(orden: Orden, eventos: Evento[]): string {
  const equipo =
    [orden.equipo_tipo, orden.marca, orden.modelo].filter(Boolean).join(" ") ||
    "Equipo en reparación";

  const contenido = html`
    <h1 class="titulo-publico">${equipo}</h1>
    <p class="subtitulo">
      Orden ${orden.numero} · recibida el ${comoFechaHora(orden.creada_en)}
    </p>

    <p class="estado-grande" data-estado="${orden.estado}">${orden.estado}</p>

    ${
      orden.presupuesto || orden.plazo
        ? html`
          <dl class="ficha">
            ${
              orden.presupuesto
                ? html`<div class="fila">
                  <dt>Presupuesto estimado</dt>
                  <dd>${orden.presupuesto}</dd>
                </div>`
                : ""
            }
            ${
              orden.plazo
                ? html`<div class="fila">
                  <dt>Plazo estimado</dt>
                  <dd>${orden.plazo}</dd>
                </div>`
                : ""
            }
          </dl>
        `
        : ""
    }

    <section class="linea-tiempo">
      <h2>Novedades</h2>
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

    <p class="ayuda centrado">
      Cualquier consulta, escribinos por
      <a href="${site.whatsapp}" target="_blank" rel="noopener">WhatsApp</a> con
      el número de orden.
    </p>
  `;

  return layout({ titulo: "Estado de tu equipo", contenido });
}
