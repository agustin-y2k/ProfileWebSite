import { html, type Html } from "../html";
import type { FilaTarifa } from "../tarifas";
import { layout } from "./layout";

type Opciones = {
  filas: FilaTarifa[];
  /** Mensaje de `normalizarTarifas` cuando algo no valida. */
  error?: string;
  guardado?: boolean;
};

const FILA_NUEVA: FilaTarifa = {
  id: "",
  service: "",
  price: "",
  note: "",
  negotiable: false,
};

function campos(fila: FilaTarifa, i: number): Html {
  const nueva = fila.id === "";

  return html`
    <fieldset>
      <legend>${nueva ? "Agregar un servicio" : fila.service || "Sin nombre"}</legend>

      <input type="hidden" name="id_${i}" value="${fila.id}" />

      <label for="service_${i}">Servicio</label>
      <input
        id="service_${i}"
        name="service_${i}"
        value="${fila.service}"
        autocomplete="off"
      />

      <div class="par">
        <div>
          <label for="price_${i}">Precio</label>
          <input
            id="price_${i}"
            name="price_${i}"
            value="${fila.price}"
            inputmode="text"
            autocomplete="off"
          />
        </div>
        <div>
          <label for="posicion_${i}">Posición</label>
          <input
            id="posicion_${i}"
            name="posicion_${i}"
            type="number"
            min="1"
            value="${i + 1}"
          />
        </div>
      </div>

      <label for="note_${i}">Aclaración <span class="opt">opcional</span></label>
      <input
        id="note_${i}"
        name="note_${i}"
        value="${fila.note}"
        placeholder="+ insumos"
        autocomplete="off"
      />

      <div class="opciones">
        <label class="chip">
          <input
            type="checkbox"
            name="negotiable_${i}"
            ${fila.negotiable ? "checked" : ""}
          />
          <span>A convenir</span>
        </label>
        ${
          nueva
            ? ""
            : html`
                <label class="chip">
                  <input type="checkbox" name="quitar_${i}" />
                  <span>Quitar</span>
                </label>
              `
        }
      </div>
    </fieldset>
  `;
}

export function vistaTarifas({ filas, error, guardado }: Opciones): string {
  // La fila vacía del final es la única forma de agregar un servicio sin
  // JavaScript: se completa y se guarda. Si queda vacía, se ignora.
  const todas = [...filas, FILA_NUEVA];

  const contenido = html`
    ${
      guardado
        ? html`<p class="aviso-ok" role="status">
            Tarifas guardadas. Ya se ven en bytefix.shop.
          </p>`
        : ""
    }
    ${error ? html`<p class="aviso-error" role="alert">${error}</p>` : ""}

    <p class="ayuda">
      Son los precios de referencia que muestra la tabla de bytefix.shop y las
      opciones del servicio al cargar una orden. El cambio se ve en el sitio en
      la próxima visita: no hay que reconstruir ni reiniciar nada.
    </p>

    <form method="post" action="/tarifas" novalidate>
      <input type="hidden" name="filas" value="${todas.length}" />
      ${todas.map(campos)}

      <button type="submit" class="principal">Guardar tarifas</button>
    </form>

    <p class="ayuda">
      El precio se escribe tal como se muestra, con el signo y los puntos
      («$35.000», «Desde $30.000»). Con «a convenir» marcado, el texto sale en
      cursiva y sin la aclaración.
    </p>
    <p class="ayuda centrado">
      <a href="/tarifas.html" target="_blank" rel="noreferrer">
        Ver el HTML que se manda al sitio
      </a>
    </p>
  `;

  return layout({ titulo: "Tarifas", volver: "/", contenido });
}
