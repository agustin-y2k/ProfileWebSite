import { config } from "./config";

/**
 * En la base las fechas se guardan siempre en ISO 8601 UTC (`toISOString`):
 * ordenable como texto, sin ambigüedad de huso y sin depender de la
 * configuración de la máquina. La conversión a hora argentina pasa recién al
 * mostrarlas.
 */
export function ahora(): string {
  return new Date().toISOString();
}

// Año de cuatro cifras y reloj de 24 h, no `dateStyle: "short"`: ese formato
// devuelve "21/8/26, 2:23 p. m.", que en un comprobante que puede terminar en
// una discusión es ambiguo de más.
const formatoFechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: config.zonaHoraria,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  timeZone: config.zonaHoraria,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function comoFechaHora(iso: string): string {
  return formatoFechaHora.format(new Date(iso)).replace(",", "");
}

export function comoFecha(iso: string): string {
  return formatoFecha.format(new Date(iso));
}

/** Año calendario argentino, que es el que numera las órdenes. */
export function anioActual(): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: config.zonaHoraria,
      year: "numeric",
    }).format(new Date()),
  );
}
