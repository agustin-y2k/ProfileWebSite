import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config";
import { db } from "./db";
import { ahora } from "./fecha";

/**
 * Borrado de las fotos sueltas del disco.
 *
 * Se pueden borrar porque no son la única copia: van embebidas dentro del PDF
 * del comprobante, y ese PDF está en el disco y además viajó por correo a las
 * dos casillas. Lo que se borra acá es la copia de trabajo, la que el panel
 * muestra como miniatura mientras el equipo está en el taller.
 *
 * El motivo real no es el espacio —dos MB por orden no llenan nada— sino no
 * guardar de por vida fotos del equipo y del entorno de gente que ya se llevó
 * su máquina.
 */

type Vencida = {
  id: number;
  numero: string;
  email_estado: string;
  pdf_archivo: string | null;
};

const vencidas = db.prepare<[string], Vencida>(`
  SELECT id, numero, email_estado, pdf_archivo
  FROM ordenes
  WHERE entregada_en IS NOT NULL
    AND entregada_en < ?
    AND fotos_borradas_en IS NULL
    AND EXISTS (SELECT 1 FROM fotos WHERE fotos.orden_id = ordenes.id)
`);

const archivosDe = db.prepare<[number], { archivo: string }>(
  `SELECT archivo FROM fotos WHERE orden_id = ?`,
);

const marcarBorradas = db.prepare(
  `UPDATE ordenes SET fotos_borradas_en = ? WHERE id = ?`,
);

function borrar(archivo: string): void {
  const ruta = resolve(config.archivos, archivo);
  // `force`: que un archivo ya no esté no puede frenar la limpieza del resto.
  rmSync(ruta, { force: true });
}

export type Registrar = (mensaje: string, datos?: Record<string, unknown>) => void;

export function limpiarFotosVencidas(registrar: Registrar): number {
  const corte = new Date(
    Date.now() - config.diasDeFotos * 24 * 60 * 60 * 1000,
  ).toISOString();

  let borradas = 0;

  for (const orden of vencidas.all(corte)) {
    // Dos guardas antes de tocar nada. Si el correo no salió, las fotos no
    // están en ninguna otra parte. Si el PDF no está en el disco, borrarlas
    // las perdería del sistema por completo: el comprobante se regeneraría sin
    // ellas. No borrar solo cuesta unos MB; borrar de más no se deshace.
    if (orden.email_estado !== "enviado") {
      registrar("fotos conservadas: el comprobante nunca se envió", {
        numero: orden.numero,
      });
      continue;
    }

    if (!orden.pdf_archivo || !existsSync(resolve(config.archivos, orden.pdf_archivo))) {
      registrar("fotos conservadas: falta el PDF del comprobante", {
        numero: orden.numero,
      });
      continue;
    }

    const archivos = archivosDe.all(orden.id);
    for (const { archivo } of archivos) borrar(`${archivo}.jpg`);

    // Las filas de `fotos` quedan: son el registro de cuántas hubo, y permiten
    // que el detalle diga "se borraron el tal día" en vez de mostrar imágenes
    // rotas o simplemente nada.
    marcarBorradas.run(ahora(), orden.id);
    borradas += archivos.length;

    registrar("fotos borradas por antigüedad", {
      numero: orden.numero,
      cantidad: archivos.length,
    });
  }

  return borradas;
}

const NOMBRE_DE_FOTO = /^[a-f0-9]{32}\.jpg$/;
const GRACIA_MS = 24 * 60 * 60 * 1000;

/**
 * Fotos subidas desde el formulario en una orden que nunca se guardó.
 *
 * Pasa: se saca la foto, suena el teléfono, se abandona la carga. El archivo
 * queda en el disco sin ninguna fila que lo referencie. Se esperan 24 horas
 * antes de borrarlo para no llevarse por delante una carga en curso.
 */
export function limpiarHuerfanas(registrar: Registrar): number {
  const referenciadas = new Set(
    db
      .prepare<[], { archivo: string }>(`SELECT archivo FROM fotos`)
      .all()
      .map((fila) => fila.archivo),
  );

  let borradas = 0;
  const limite = Date.now() - GRACIA_MS;

  for (const nombre of readdirSync(config.archivos)) {
    if (!NOMBRE_DE_FOTO.test(nombre)) continue;
    if (referenciadas.has(nombre.slice(0, -4))) continue;

    const ruta = resolve(config.archivos, nombre);
    if (statSync(ruta).mtimeMs > limite) continue;

    rmSync(ruta, { force: true });
    borradas += 1;
  }

  if (borradas > 0) registrar("fotos huérfanas borradas", { cantidad: borradas });
  return borradas;
}

const CADA_MS = 24 * 60 * 60 * 1000;

/**
 * Arranca la limpieza: una pasada al iniciar y otra por día.
 *
 * Va adentro del mismo proceso y no en un contenedor de cron porque la
 * decisión se toma comparando fechas, no midiendo tiempo transcurrido: que la
 * Pi haya estado apagada una semana no saltea ninguna pasada.
 */
export function programarLimpieza(registrar: Registrar): void {
  const pasada = () => {
    try {
      limpiarFotosVencidas(registrar);
      limpiarHuerfanas(registrar);
    } catch (error) {
      registrar("falló la limpieza de fotos", { error: String(error) });
    }
  };

  pasada();
  // `unref`: el temporizador no tiene que impedir que el proceso termine
  // cuando Docker lo para.
  setInterval(pasada, CADA_MS).unref();
}
