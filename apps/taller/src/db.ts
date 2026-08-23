import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { config } from "./config";
import { anioActual } from "./fecha";

mkdirSync(config.datos, { recursive: true });
mkdirSync(config.archivos, { recursive: true });

export const db = new Database(config.baseDeDatos);

// WAL: las lecturas no bloquean a la escritura. Con un solo proceso alcanza y
// sobra, pero evita que abrir la lista mientras se guarda una orden trabe.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/**
 * El esquema se crea entero de una vez, incluidas las columnas que todavía no
 * usa nadie (firma, PDF, estado del envío, borrado de fotos). Son gratis
 * mientras estén vacías y evitan una migración por cada paso del plan.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS ordenes (
    id                INTEGER PRIMARY KEY,
    numero            TEXT    NOT NULL UNIQUE,
    -- Token impredecible para el seguimiento público. El número de orden es
    -- correlativo: si la URL fuera /BF-2026-0001, contar hasta 0002 alcanzaría
    -- para leer los datos de otro cliente.
    token             TEXT    NOT NULL UNIQUE,
    creada_en         TEXT    NOT NULL,
    estado            TEXT    NOT NULL DEFAULT 'recibida',
    entregada_en      TEXT,

    cliente_nombre    TEXT    NOT NULL,
    cliente_telefono  TEXT    NOT NULL,
    cliente_email     TEXT    NOT NULL,
    cliente_dni       TEXT,

    equipo_tipo       TEXT,
    marca             TEXT,
    modelo            TEXT,
    serie             TEXT,
    accesorios        TEXT    NOT NULL DEFAULT '[]',
    enciende          TEXT,
    observaciones     TEXT,

    servicio_id       TEXT,
    -- Copia del nombre del servicio al momento de recibir el equipo. El id
    -- solo apunta a la tarifa vigente, y las tarifas ahora se editan: sin esta
    -- copia, renombrar un servicio cambiaría lo que dice un comprobante ya
    -- firmado, y borrarlo lo dejaría sin servicio.
    servicio_nombre   TEXT,
    falla             TEXT,
    presupuesto       TEXT,
    plazo             TEXT,

    firma_png         BLOB,
    firmada_en        TEXT,

    pdf_archivo       TEXT,
    pdf_sha256        TEXT,
    email_estado      TEXT    NOT NULL DEFAULT 'pendiente',
    email_enviado_en  TEXT,
    email_error       TEXT,

    fotos_borradas_en TEXT
  );

  CREATE INDEX IF NOT EXISTS ordenes_creada_en ON ordenes (creada_en DESC);

  -- Cada novedad es una fila nueva, no un campo que se pisa: el historial es
  -- justamente lo que el cliente ve al seguir su equipo.
  CREATE TABLE IF NOT EXISTS eventos (
    id        INTEGER PRIMARY KEY,
    orden_id  INTEGER NOT NULL REFERENCES ordenes (id) ON DELETE CASCADE,
    estado    TEXT    NOT NULL,
    nota      TEXT,
    creado_en TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS eventos_orden ON eventos (orden_id, creado_en);

  CREATE TABLE IF NOT EXISTS fotos (
    id       INTEGER PRIMARY KEY,
    orden_id INTEGER NOT NULL REFERENCES ordenes (id) ON DELETE CASCADE,
    archivo  TEXT    NOT NULL,
    posicion INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS fotos_orden ON fotos (orden_id, posicion);
`);

/**
 * Agrega una columna si todavía no está.
 *
 * `CREATE TABLE IF NOT EXISTS` no toca una tabla que ya existe, así que una
 * columna nueva nunca llegaría a la base de la Raspberry. SQLite no tiene
 * `ADD COLUMN IF NOT EXISTS`, de ahí la consulta al PRAGMA.
 */
function agregarColumna(tabla: string, columna: string, definicion: string): void {
  const columnas = db
    .prepare<[string], { name: string }>(`SELECT name FROM pragma_table_info(?)`)
    .all(tabla);

  if (columnas.some((existente) => existente.name === columna)) return;
  db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
}

agregarColumna("ordenes", "servicio_nombre", "TEXT");

/**
 * Próximo número de orden, con el formato `BF-2026-0001`.
 *
 * Sale del máximo existente del año y no de un `COUNT(*)`: si alguna vez se
 * borra una orden, contar reutilizaría un número ya emitido y habría dos
 * comprobantes distintos con la misma identificación.
 *
 * Va siempre adentro de la misma transacción que el INSERT (ver `crearOrden`).
 */
export function proximoNumero(): string {
  const anio = anioActual();
  const prefijo = `BF-${anio}-`;

  const fila = db
    .prepare<[string], { numero: string }>(
      `SELECT numero FROM ordenes WHERE numero LIKE ? ORDER BY numero DESC LIMIT 1`,
    )
    .get(`${prefijo}%`);

  const ultimo = fila ? Number(fila.numero.slice(prefijo.length)) : 0;
  return `${prefijo}${String(ultimo + 1).padStart(4, "0")}`;
}
