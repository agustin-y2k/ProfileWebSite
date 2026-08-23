import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import {
  TARIFAS_POR_DEFECTO,
  normalizarTarifas,
  tarifaDe as buscarTarifa,
  type PriceRow,
} from "@sites/negocio";
import { config } from "./config";

/**
 * Tarifas editables, guardadas en `tarifas.json` dentro del volumen de datos.
 *
 * Es lo único del sistema que dos servicios distintos leen en vivo: el panel
 * las usa para el `<select>` de la orden nueva, y el nginx de bytefix.shop pide
 * `/tarifas.html` por la red interna de Docker en cada visita. Por eso el
 * archivo es la fuente de verdad y no una constante compilada: cambiar un
 * precio no puede depender de reconstruir dos imágenes en la Raspberry.
 */

/**
 * Copia en memoria, invalidada por la fecha de modificación del archivo.
 *
 * Sin esto, cada visita a la tabla de precios sería una lectura de disco y un
 * `JSON.parse`. Mirar el mtime cuesta un `stat` y además hace que una edición a
 * mano por SSH se note sin reiniciar el proceso.
 */
let cache: { mtimeMs: number; tarifas: PriceRow[] } | null = null;

function escribir(tarifas: readonly PriceRow[]): void {
  // Se escribe a un temporal y se renombra: `rename` es atómico dentro del
  // mismo sistema de archivos, así que una lectura nunca cae sobre un archivo
  // a medio escribir. Sin esto, un corte de luz en el momento justo dejaría el
  // JSON truncado y el sitio sin tabla de precios.
  const temporal = `${config.tarifas}.tmp`;
  writeFileSync(temporal, `${JSON.stringify(tarifas, null, 2)}\n`, "utf8");
  renameSync(temporal, config.tarifas);
  cache = null;
}

/**
 * Las tarifas vigentes.
 *
 * Nunca lanza: si el archivo no existe lo siembra con los valores por defecto,
 * y si quedó ilegible devuelve lo último que se leyó bien. Un JSON roto tiene
 * que degradar a precios viejos, no tumbar el panel de órdenes.
 */
export function leerTarifas(): PriceRow[] {
  if (!existsSync(config.tarifas)) {
    escribir(TARIFAS_POR_DEFECTO);
    cache = {
      mtimeMs: statSync(config.tarifas).mtimeMs,
      tarifas: [...TARIFAS_POR_DEFECTO],
    };
    return cache.tarifas;
  }

  const mtimeMs = statSync(config.tarifas).mtimeMs;
  if (cache && cache.mtimeMs === mtimeMs) return cache.tarifas;

  try {
    const tarifas = normalizarTarifas(JSON.parse(readFileSync(config.tarifas, "utf8")));
    cache = { mtimeMs, tarifas };
    return tarifas;
  } catch (error) {
    console.error(`tarifas.json ilegible, se usan las anteriores: ${String(error)}`);
    // Se cachea el error contra el mismo mtime: sin esto, un archivo roto haría
    // un parse fallido por cada visita a la tabla de precios.
    const anteriores = cache?.tarifas ?? [...TARIFAS_POR_DEFECTO];
    cache = { mtimeMs, tarifas: anteriores };
    return anteriores;
  }
}

/** Guarda la lista completa. Lanza si algo no valida, sin tocar el archivo. */
export function guardarTarifas(datos: unknown): PriceRow[] {
  const tarifas = normalizarTarifas(datos);
  if (tarifas.length === 0) {
    throw new Error("Tiene que quedar al menos una tarifa.");
  }
  escribir(tarifas);
  return tarifas;
}

/** Tarifa vigente de un servicio, o `undefined` si ya no está en la lista. */
export function tarifaDe(id: string): PriceRow | undefined {
  return buscarTarifa(leerTarifas(), id);
}

/**
 * Id a partir del nombre del servicio, para una fila nueva.
 *
 * El id queda fijo desde que se crea: es el ancla `#tarifa-<id>` del sitio y la
 * clave con la que una orden guardada apunta a su servicio. Renombrar después
 * el servicio no lo cambia, y está bien que así sea.
 */
export function idDeServicio(nombre: string, tomados: readonly string[]): string {
  const base =
    nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "servicio";

  let id = base;
  let n = 2;
  while (tomados.includes(id)) id = `${base}-${n++}`;
  return id;
}

// ── Formulario ───────────────────────────────────────────────────────────────

/**
 * Una fila tal como viaja por el formulario: todo texto y sin validar.
 *
 * No se reutiliza `PriceRow` porque acá una fila a medio completar es normal
 * —es lo que hay que poder volver a dibujar cuando algo no valida— y `PriceRow`
 * promete lo contrario.
 */
export type FilaTarifa = {
  id: string;
  service: string;
  price: string;
  note: string;
  negotiable: boolean;
};

export function comoFilas(tarifas: readonly PriceRow[]): FilaTarifa[] {
  return tarifas.map((fila) => ({
    id: fila.id,
    service: fila.service,
    price: fila.price,
    note: fila.note ?? "",
    negotiable: fila.negotiable === true,
  }));
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Lee el formulario de tarifas.
 *
 * Los campos van numerados (`service_0`, `price_0`, …) y no como arreglos
 * repetidos: un checkbox sin marcar no se envía, así que con `negotiable[]` la
 * marca de una fila terminaría aplicada a otra. Con el índice en el nombre, la
 * fila la define el número y no el orden de llegada.
 */
export function leerFormularioTarifas(cuerpo: Record<string, unknown>): FilaTarifa[] {
  const total = Number(cuerpo["filas"] ?? 0);
  const leidas: { fila: FilaTarifa; posicion: number }[] = [];

  for (let i = 0; i < total; i++) {
    // Marcada para quitar, o la fila vacía del final que nadie completó.
    if (cuerpo[`quitar_${i}`] !== undefined) continue;
    const service = texto(cuerpo[`service_${i}`]);
    const price = texto(cuerpo[`price_${i}`]);
    if (!service && !price) continue;

    leidas.push({
      fila: {
        id: texto(cuerpo[`id_${i}`]),
        service,
        price,
        note: texto(cuerpo[`note_${i}`]),
        negotiable: cuerpo[`negotiable_${i}`] !== undefined,
      },
      // Empate resuelto por el orden en que ya estaban: escribir la misma
      // posición en dos filas no puede reordenar el resto de la tabla.
      posicion: Number(cuerpo[`posicion_${i}`] ?? i + 1) || i + 1,
    });
  }

  leidas.sort((a, b) => a.posicion - b.posicion);

  // El id se asigna acá y no al guardar: una fila nueva que no valida tiene que
  // volver al formulario ya con su id, o al reintentar se generaría otro.
  const tomados = leidas.map(({ fila }) => fila.id).filter(Boolean);
  return leidas.map(({ fila }) => {
    if (fila.id) return fila;
    const id = idDeServicio(fila.service, tomados);
    tomados.push(id);
    return { ...fila, id };
  });
}
