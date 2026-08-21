import { html } from "../html";
import { comoFechaHora } from "../fecha";
import type { Orden } from "../ordenes";
import { layout } from "./layout";

export function vistaLista(ordenes: Orden[], reciente?: string): string {
  const contenido = html`
    ${
      reciente
        ? html`<p class="aviso-ok" role="status">
            Orden <strong>${reciente}</strong> guardada.
          </p>`
        : ""
    }

    <a class="principal enlace-boton" href="/nueva">Nueva orden</a>

    ${
      ordenes.length === 0
        ? html`<p class="vacio">
            Todavía no hay órdenes cargadas. La primera se crea con el botón de arriba,
            con el equipo y el cliente adelante.
          </p>`
        : html`
            <ul class="ordenes">
              ${ordenes.map(
                (orden) => html`
                  <li>
                    <a href="/ordenes/${orden.numero}">
                      <span class="numero">${orden.numero}</span>
                      <span class="cliente">${orden.cliente_nombre}</span>
                      <span class="equipo">
                        ${
                          [orden.equipo_tipo, orden.marca, orden.modelo]
                            .filter(Boolean)
                            .join(" · ") || "Equipo sin describir"
                        }
                      </span>
                      <span class="pie">
                        <span class="estado" data-estado="${orden.estado}"
                          >${orden.estado}</span
                        >
                        <span class="fecha">${comoFechaHora(orden.creada_en)}</span>
                      </span>
                    </a>
                  </li>
                `,
              )}
            </ul>
          `
    }
  `;

  return layout({ titulo: "Órdenes", contenido });
}
