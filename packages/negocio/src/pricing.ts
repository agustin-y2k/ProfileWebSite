/**
 * Tarifas de ByteFix.
 *
 * Este módulo ya no es la lista viva: desde que las tarifas se editan sin
 * reconstruir nada, la lista que se muestra sale de `datos/tarifas.json`, que
 * mantiene el sistema de órdenes. Acá quedan tres cosas que sí tienen que ser
 * compartidas:
 *
 *   - la forma de una fila (`PriceRow`) y su validación (`normalizarTarifas`),
 *     para que el JSON escrito por el taller y el que lee el sitio no puedan
 *     divergir en silencio;
 *   - los valores de arranque (`TARIFAS_POR_DEFECTO`), que siembran el archivo
 *     la primera vez y que bytefix hornea como respaldo en su imagen;
 *   - el HTML de las filas (`filasDeTarifas`), que genera el taller en cada
 *     visita y bytefix en el build. Si el marcado viviera en dos lados, el
 *     respaldo y la versión en vivo se verían distintos apenas alguien tocara
 *     uno de los dos.
 */

export type PriceRow = {
  /** Coincide con `Service.id`: permite saltar de la tarjeta a su tarifa. */
  id: string;
  service: string;
  price: string;
  note?: string;
  negotiable?: boolean;
};

/**
 * Valores de arranque. Solo se usan para sembrar `tarifas.json` la primera vez
 * y como respaldo si el taller no contesta; editarlos acá no cambia lo que ve
 * un visitante en un sitio ya desplegado.
 */
export const TARIFAS_POR_DEFECTO: readonly PriceRow[] = [
  { id: "gobierno", service: "Desbloqueo Notebooks Gobierno", price: "$35.000" },
  { id: "tecnico", service: "Servicio Técnico General", price: "$25.000" },
  { id: "hardware", service: "Reparación de Hardware", price: "Desde $30.000" },
  { id: "upgrade", service: "Upgrades & SSD", price: "$15.000", note: "+ insumos" },
  {
    id: "datos",
    service: "Recuperación de Datos",
    price: "$30.000",
    note: "si es recuperable",
  },
  {
    id: "web",
    service: "Programación Web & Scripts",
    price: "Negociable",
    negotiable: true,
  },
  { id: "redes", service: "Redes y Servidores", price: "Negociable", negotiable: true },
];

/** Tarifa de un servicio dentro de una lista, o `undefined` si el id no está. */
export function tarifaDe(tarifas: readonly PriceRow[], id: string): PriceRow | undefined {
  return tarifas.find((fila) => fila.id === id);
}

// ── Validación ───────────────────────────────────────────────────────────────

const ID_VALIDO = /^[a-z0-9-]{1,40}$/;

function comoTexto(valor: unknown, campo: string, fila: number): string {
  if (typeof valor !== "string") {
    throw new Error(`Fila ${fila}: "${campo}" tiene que ser texto.`);
  }
  return valor.trim();
}

/**
 * Convierte lo que salga de un JSON o de un formulario en una lista de tarifas
 * usable, o falla explicando qué está mal.
 *
 * Es estricta a propósito. Lo que devuelve termina en el HTML público y en el
 * `<select>` con el que se carga una orden con el cliente enfrente: es mejor
 * quedarse con las tarifas anteriores y un error en el log que publicar una
 * tabla a medias porque una fila venía sin precio.
 */
export function normalizarTarifas(datos: unknown): PriceRow[] {
  if (!Array.isArray(datos)) {
    throw new Error("Se esperaba una lista de tarifas.");
  }

  const vistos = new Set<string>();

  return datos.map((cruda, indice) => {
    const fila = indice + 1;
    if (typeof cruda !== "object" || cruda === null) {
      throw new Error(`Fila ${fila}: se esperaba un objeto.`);
    }

    const registro = cruda as Record<string, unknown>;
    const id = comoTexto(registro["id"], "id", fila);
    const service = comoTexto(registro["service"], "service", fila);
    const price = comoTexto(registro["price"], "price", fila);
    const note =
      registro["note"] === undefined ? "" : comoTexto(registro["note"], "note", fila);

    if (!ID_VALIDO.test(id)) {
      throw new Error(
        `Fila ${fila}: el id "${id}" tiene que ser minúsculas, números y guiones.`,
      );
    }
    // El id es el ancla `#tarifa-<id>` a la que enlazan las tarjetas de
    // servicio y la clave con la que una orden vieja recupera su servicio.
    // Repetido, el enlace llevaría a cualquiera de las dos filas.
    if (vistos.has(id)) throw new Error(`El id "${id}" está repetido.`);
    vistos.add(id);

    if (!service) throw new Error(`Fila ${fila}: falta el nombre del servicio.`);
    if (!price) throw new Error(`Fila ${fila}: falta el precio.`);

    const normalizada: PriceRow = { id, service, price };
    if (note) normalizada.note = note;
    if (registro["negotiable"] === true) normalizada.negotiable = true;
    return normalizada;
  });
}

// ── HTML ─────────────────────────────────────────────────────────────────────

const REEMPLAZOS: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Escapado propio y no el de `apps/taller/src/html.ts`: este paquete lo
// importan las dos aplicaciones, así que no puede depender de ninguna.
function escapar(valor: string): string {
  return valor.replace(/[&<>"']/g, (caracter) => REEMPLAZOS[caracter] ?? caracter);
}

/**
 * Las filas `<tr>` del cuerpo de la tabla de precios de bytefix.
 *
 * Las clases son globales (`tarifa-*`) y no CSS Modules: el marcado lo genera
 * el taller en runtime, que no tiene forma de conocer los nombres con hash que
 * Vite le pone a un `.module.css`. Están definidas en
 * `apps/bytefix/src/styles/global.css`.
 */
export function filasDeTarifas(tarifas: readonly PriceRow[]): string {
  return tarifas
    .map((fila) => {
      const precio = fila.negotiable
        ? `<span class="tarifa-negociable">${escapar(fila.price)}</span>`
        : `<span class="tarifa-monto">${escapar(fila.price)}</span>` +
          (fila.note ? `<small class="tarifa-nota">${escapar(fila.note)}</small>` : "");

      return (
        `<tr id="tarifa-${escapar(fila.id)}" class="tarifa-fila">` +
        `<th scope="row" class="tarifa-servicio">${escapar(fila.service)}</th>` +
        `<td class="tarifa-precio">${precio}</td>` +
        `</tr>`
      );
    })
    .join("");
}
