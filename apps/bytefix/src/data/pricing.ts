import { TARIFAS_POR_DEFECTO, filasDeTarifas } from "@sites/negocio";

/**
 * La tabla de precios ya no se hornea en el build.
 *
 * El cuerpo de la tabla lo arma el sistema de órdenes —el mismo módulo que
 * completa el presupuesto del comprobante que firma el cliente— y el nginx de
 * este sitio lo inserta con SSI en cada visita. Cambiar un precio es editarlo
 * en el panel: no hay que reconstruir la imagen ni reiniciar el contenedor, y
 * el precio del sitio y el del comprobante no pueden quedar desfasados.
 *
 * Sigue siendo HTML del lado del servidor: la tabla llega hecha, sin fetch ni
 * JavaScript, y un buscador o un navegador con JS apagado la ve igual.
 */

/** Las filas con los valores por defecto, ya en HTML. */
export function tarifasHorneadas(): string {
  return filasDeTarifas(TARIFAS_POR_DEFECTO);
}

/**
 * Lo que va dentro del `<tbody>`.
 *
 * Son dos directivas de SSI que nginx resuelve antes de mandar el HTML:
 *
 *   - `#block` define el respaldo —las tarifas del último build— y no se
 *     imprime; queda guardado con ese nombre.
 *   - `#include … stub=` pide las filas en vivo al sistema de órdenes y, si
 *     esa petición falla o vuelve vacía, imprime el bloque en su lugar.
 *
 * Con eso, el taller caído significa precios de la última compilación y no una
 * tabla vacía, sin necesidad de un `error_page` en nginx que —al atrapar
 * también el 404 de la ruta interna— la volvería pública.
 *
 * En desarrollo (`vite dev`) no hay nginx que resuelva nada, así que se pintan
 * los valores por defecto directamente: la sección se ve y se maqueta igual.
 */
export const cuerpoDeTarifas = import.meta.env.DEV
  ? tarifasHorneadas()
  : `<!--#block name="tarifas_horneadas" -->${tarifasHorneadas()}<!--#endblock -->` +
    `<!--#include virtual="/tarifas" stub="tarifas_horneadas" -->`;
