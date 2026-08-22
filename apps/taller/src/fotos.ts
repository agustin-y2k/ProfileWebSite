import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config";

/**
 * Las fotos del equipo al recibirlo.
 *
 * Se suben de a una, apenas se sacan, y no junto con el formulario: así el
 * "Guardar orden" es instantáneo aunque haya cuatro fotos, y una señal mala no
 * arruina toda la carga. Mientras el técnico sigue tipeando, la foto ya viajó.
 *
 * Van al disco y no a la base: un blob de varios MB por orden infla el archivo
 * de SQLite sin ganar nada.
 */

/** 32 hexadecimales: impredecible, y sirve de nombre de archivo sin escapar. */
const ID_VALIDO = /^[a-f0-9]{32}$/;

/** Tope máximo por foto ya redimensionada. El navegador las deja en ~200 KB;
 *  esto es el techo por si el redimensionado no corrió. */
export const FOTO_MAX_BYTES = 3 * 1024 * 1024;

/** Suficientes para documentar un equipo sin llenar la tarjeta de la Pi. */
export const FOTOS_MAX = 6;

export function esIdValido(id: string): boolean {
  return ID_VALIDO.test(id);
}

export function rutaDeFoto(id: string): string | null {
  if (!esIdValido(id)) return null;
  const ruta = resolve(config.archivos, `${id}.jpg`);
  return existsSync(ruta) ? ruta : null;
}

export function guardarFoto(contenido: Buffer): string {
  const id = randomBytes(16).toString("hex");
  writeFileSync(resolve(config.archivos, `${id}.jpg`), contenido);
  return id;
}

/**
 * Deja solo los ids que existen de verdad en el disco.
 *
 * El formulario manda los ids en campos ocultos, así que podrían venir
 * inventados: sin este filtro, la orden quedaría apuntando a fotos que no
 * están y el detalle mostraría imágenes rotas.
 */
export function filtrarExistentes(ids: string[]): string[] {
  return ids.filter((id) => rutaDeFoto(id) !== null).slice(0, FOTOS_MAX);
}
