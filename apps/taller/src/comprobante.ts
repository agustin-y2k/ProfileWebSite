import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config";
import { db } from "./db";
import { rutaDeFoto } from "./fotos";
import { buscarPorNumero, fotosDe, type Orden } from "./ordenes";
import { construirComprobante, type FotoEnPdf } from "./pdf";

/**
 * Emisión y guardado del comprobante.
 *
 * El PDF se escribe al disco y el hash SHA-256 va a la base. Ese hash es lo
 * único del sistema que hace verificable un comprobante: si mañana alguien
 * aparece con un PDF que dice otro precio, el hash no coincide con el que se
 * emitió. El archivo, además, es el que conserva las fotos cuando las sueltas
 * se borren a los 30 días de entregado el equipo.
 */

const guardarDatosPdf = db.prepare(
  `UPDATE ordenes SET pdf_archivo = ?, pdf_sha256 = ? WHERE id = ?`,
);

function rutaDePdf(numero: string): string {
  return resolve(config.archivos, `${numero}.pdf`);
}

function cargarFotos(orden: Orden): FotoEnPdf[] {
  const cargadas: FotoEnPdf[] = [];
  for (const id of fotosDe(orden)) {
    const ruta = rutaDeFoto(id);
    // Puede no estar si ya pasó el borrado de los 30 días. El comprobante
    // viejo sigue teniéndolas adentro; este solo se emite sin ellas.
    if (ruta) cargadas.push({ id, jpeg: readFileSync(ruta) });
  }
  return cargadas;
}

export async function emitirComprobante(orden: Orden): Promise<string> {
  const bytes = await construirComprobante(orden, cargarFotos(orden));
  const contenido = Buffer.from(bytes);
  const ruta = rutaDePdf(orden.numero);

  writeFileSync(ruta, contenido);

  // El hash se graba una sola vez, en la primera emisión. Es el registro de
  // qué documento se emitió y se mandó; si una regeneración lo pisara, la
  // copia que tiene el cliente dejaría de coincidir con el registro y el hash
  // no probaría nada. La generación es determinista, así que en el caso normal
  // el archivo regenerado es idéntico de todos modos.
  if (!orden.pdf_sha256) {
    const sha256 = createHash("sha256").update(contenido).digest("hex");
    guardarDatosPdf.run(`${orden.numero}.pdf`, sha256, orden.id);
  }

  return ruta;
}

/**
 * Ruta del PDF de una orden, generándolo si todavía no existe.
 *
 * La regeneración cubre dos casos: que la emisión haya fallado al crear la
 * orden —que no la cancela, porque perder la carga con el cliente enfrente es
 * peor que quedarse sin PDF— y que el volumen se haya recreado.
 */
export async function asegurarComprobante(numero: string): Promise<string | null> {
  const orden = buscarPorNumero(numero);
  if (!orden) return null;

  const ruta = rutaDePdf(numero);
  if (existsSync(ruta) && orden.pdf_sha256) return ruta;

  return await emitirComprobante(orden);
}
