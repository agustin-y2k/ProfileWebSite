/**
 * Borra una orden entera: sus fotos, su comprobante y su historial.
 *
 *   docker compose run --rm taller node --import tsx src/borrar.ts BF-2026-0001
 *
 * Existe para las órdenes de prueba y las cargadas por error. No es una
 * operación de todos los días: una orden borrada se lleva puesto el registro
 * que la hacía verificable, así que pide confirmación escribiendo el número.
 *
 * Va como script y no como botón del panel a propósito: un botón de borrar al
 * lado de una orden real es un accidente esperando que pase.
 */
import { createInterface } from "node:readline";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { config } from "./config";
import { db } from "./db";
import { comoFechaHora } from "./fecha";

const numero = (process.argv[2] ?? "").trim().toUpperCase();

if (!numero) {
  console.error("Uso: node --import tsx src/borrar.ts BF-2026-0001");
  process.exit(1);
}

type Fila = {
  id: number;
  numero: string;
  creada_en: string;
  cliente_nombre: string;
  estado: string;
};

const orden = db
  .prepare<[string], Fila>(
    `SELECT id, numero, creada_en, cliente_nombre, estado FROM ordenes WHERE numero = ?`,
  )
  .get(numero);

if (!orden) {
  console.error(`No existe ninguna orden ${numero}.`);
  process.exit(1);
}

const fotos = db
  .prepare<[number], { archivo: string }>(`SELECT archivo FROM fotos WHERE orden_id = ?`)
  .all(orden.id);

const eventos = db
  .prepare<[number], { total: number }>(
    `SELECT COUNT(*) AS total FROM eventos WHERE orden_id = ?`,
  )
  .get(orden.id);

console.log("");
console.log(`  Orden     ${orden.numero}`);
console.log(`  Cliente   ${orden.cliente_nombre}`);
console.log(`  Recibida  ${comoFechaHora(orden.creada_en)}`);
console.log(`  Estado    ${orden.estado}`);
console.log(
  `  Se borran ${fotos.length} foto(s), ${eventos?.total ?? 0} novedad(es) y el PDF`,
);
console.log("");
console.log("  Esto no se puede deshacer.");
console.log("");

function confirmar(): Promise<string> {
  return new Promise((resolver) => {
    const lector = createInterface({ input: stdin, output: stdout, terminal: true });
    lector.question(`  Escribí ${numero} para confirmar: `, (valor) => {
      lector.close();
      resolver(valor.trim().toUpperCase());
    });
  });
}

if (stdin.isTTY) {
  const respuesta = await confirmar();
  if (respuesta !== numero) {
    console.log("\nNo coincide. No se borró nada.");
    process.exit(1);
  }
} else if (process.argv[3] !== "--si") {
  console.error("Sin terminal para confirmar. Agregá --si si estás seguro.");
  process.exit(1);
}

// Los archivos primero: si algo falla, la fila sigue ahí y se puede reintentar.
// Al revés quedarían archivos sueltos sin nada que los referencie.
for (const foto of fotos) {
  rmSync(resolve(config.archivos, `${foto.archivo}.jpg`), { force: true });
}
rmSync(resolve(config.archivos, `${numero}.pdf`), { force: true });

// `eventos` y `fotos` se van solas por la clave foránea en cascada.
db.prepare(`DELETE FROM ordenes WHERE id = ?`).run(orden.id);

console.log(`\n  Borrada ${numero}: fotos, comprobante e historial.\n`);
