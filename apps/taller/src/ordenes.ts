import { randomBytes } from "node:crypto";
import { db, proximoNumero } from "./db";
import { ahora } from "./fecha";
import { filtrarExistentes } from "./fotos";

/**
 * Los estados por los que pasa un equipo. El orden del arreglo es el orden en
 * que se ofrecen en el panel: casi siempre el próximo estado es el de abajo.
 *
 * `entregada` es el único con consecuencia además de informativa: marca el
 * inicio de los 30 días tras los cuales se borran las fotos del disco.
 */
export const ESTADOS = [
  "recibida",
  "en diagnóstico",
  "presupuestada",
  "aprobada",
  "en reparación",
  "lista para retirar",
  "entregada",
  "sin arreglo",
  "cancelada",
] as const;

export type Estado = (typeof ESTADOS)[number];

export const TIPOS_EQUIPO = ["Notebook", "PC de escritorio", "Celular", "Otro"] as const;

export const ACCESORIOS = [
  "Cargador",
  "Batería",
  "Funda",
  "Cable",
  "Disco externo",
] as const;

export type Orden = {
  id: number;
  numero: string;
  token: string;
  creada_en: string;
  estado: Estado;
  entregada_en: string | null;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  cliente_dni: string | null;
  equipo_tipo: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  accesorios: string;
  enciende: string | null;
  observaciones: string | null;
  servicio_id: string | null;
  falla: string | null;
  presupuesto: string | null;
  plazo: string | null;
  firma_png: Buffer | null;
  firmada_en: string | null;
  pdf_archivo: string | null;
  pdf_sha256: string | null;
  email_estado: string;
  email_enviado_en: string | null;
  email_error: string | null;
  fotos_borradas_en: string | null;
};

/** Lo que llega del formulario, ya normalizado pero todavía sin validar. */
export type DatosOrden = {
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  cliente_dni: string;
  equipo_tipo: string;
  marca: string;
  modelo: string;
  serie: string;
  accesorios: string[];
  enciende: string;
  observaciones: string;
  servicio_id: string;
  falla: string;
  presupuesto: string;
  plazo: string;
  firma: string;
  /** Ids de las fotos ya subidas, en campos ocultos del formulario. */
  fotos: string[];
};

export const ORDEN_VACIA: DatosOrden = {
  cliente_nombre: "",
  cliente_telefono: "",
  cliente_email: "",
  cliente_dni: "",
  equipo_tipo: "",
  marca: "",
  modelo: "",
  serie: "",
  accesorios: [],
  enciende: "",
  observaciones: "",
  servicio_id: "",
  falla: "",
  presupuesto: "",
  plazo: "",
  firma: "",
  fotos: [],
};

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/** Un checkbox repetido llega como arreglo; uno solo, como cadena suelta. */
function lista(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map(texto).filter(Boolean);
  const uno = texto(valor);
  return uno ? [uno] : [];
}

export function leerFormulario(cuerpo: Record<string, unknown>): DatosOrden {
  return {
    cliente_nombre: texto(cuerpo["cliente_nombre"]),
    cliente_telefono: texto(cuerpo["cliente_telefono"]),
    cliente_email: texto(cuerpo["cliente_email"]),
    cliente_dni: texto(cuerpo["cliente_dni"]),
    equipo_tipo: texto(cuerpo["equipo_tipo"]),
    marca: texto(cuerpo["marca"]),
    modelo: texto(cuerpo["modelo"]),
    serie: texto(cuerpo["serie"]),
    accesorios: lista(cuerpo["accesorios"]),
    enciende: texto(cuerpo["enciende"]),
    observaciones: texto(cuerpo["observaciones"]),
    servicio_id: texto(cuerpo["servicio_id"]),
    falla: texto(cuerpo["falla"]),
    presupuesto: texto(cuerpo["presupuesto"]),
    plazo: texto(cuerpo["plazo"]),
    firma: texto(cuerpo["firma"]),
    fotos: filtrarExistentes(lista(cuerpo["fotos"])),
  };
}

/** Tope de la firma: un trazo normal pesa entre 5 y 30 KB. */
const FIRMA_MAX_BYTES = 400_000;
const FIRMA_PREFIJO = "data:image/png;base64,";

/**
 * Errores por campo. Si el objeto sale vacío, los datos son válidos.
 *
 * Solo son obligatorios los tres con los que se puede contactar al cliente:
 * cualquier otro campo exigido es un segundo de más con la persona esperando
 * del otro lado del mostrador, y el sistema que tarda es el que no se usa.
 */
export function validar(datos: DatosOrden): Record<string, string> {
  const errores: Record<string, string> = {};

  if (!datos.cliente_nombre) errores["cliente_nombre"] = "Falta el nombre.";
  if (!datos.cliente_telefono) errores["cliente_telefono"] = "Falta el teléfono.";

  if (!datos.cliente_email) {
    errores["cliente_email"] = "Falta el correo: es a donde se manda el comprobante.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.cliente_email)) {
    errores["cliente_email"] = "Ese correo no parece válido. Revisalo con el cliente.";
  }

  if (datos.firma && !datos.firma.startsWith(FIRMA_PREFIJO)) {
    errores["firma"] = "La firma no se pudo leer. Probá borrarla y firmar de nuevo.";
  } else if (datos.firma.length > FIRMA_MAX_BYTES) {
    errores["firma"] = "La firma es demasiado grande.";
  }

  return errores;
}

function firmaComoBuffer(firma: string): Buffer | null {
  if (!firma.startsWith(FIRMA_PREFIJO)) return null;
  return Buffer.from(firma.slice(FIRMA_PREFIJO.length), "base64");
}

const insertarOrden = db.prepare(`
  INSERT INTO ordenes (
    numero, token, creada_en, estado,
    cliente_nombre, cliente_telefono, cliente_email, cliente_dni,
    equipo_tipo, marca, modelo, serie, accesorios, enciende, observaciones,
    servicio_id, falla, presupuesto, plazo,
    firma_png, firmada_en
  ) VALUES (
    @numero, @token, @creada_en, 'recibida',
    @cliente_nombre, @cliente_telefono, @cliente_email, @cliente_dni,
    @equipo_tipo, @marca, @modelo, @serie, @accesorios, @enciende, @observaciones,
    @servicio_id, @falla, @presupuesto, @plazo,
    @firma_png, @firmada_en
  )
`);

const insertarEvento = db.prepare(`
  INSERT INTO eventos (orden_id, estado, nota, creado_en)
  VALUES (?, ?, ?, ?)
`);

const insertarFoto = db.prepare(`
  INSERT INTO fotos (orden_id, archivo, posicion) VALUES (?, ?, ?)
`);

/**
 * Crea la orden y su primer evento en una sola transacción.
 *
 * Que `proximoNumero()` esté adentro es lo que garantiza que no se emitan dos
 * comprobantes con el mismo número: better-sqlite3 es síncrono, así que la
 * transacción no se interrumpe en el medio.
 */
export const crearOrden = db.transaction((datos: DatosOrden): string => {
  const numero = proximoNumero();
  const creada_en = ahora();
  const firma = firmaComoBuffer(datos.firma);

  const resultado = insertarOrden.run({
    numero,
    token: randomBytes(16).toString("base64url"),
    creada_en,
    cliente_nombre: datos.cliente_nombre,
    cliente_telefono: datos.cliente_telefono,
    cliente_email: datos.cliente_email,
    cliente_dni: datos.cliente_dni || null,
    equipo_tipo: datos.equipo_tipo || null,
    marca: datos.marca || null,
    modelo: datos.modelo || null,
    serie: datos.serie || null,
    accesorios: JSON.stringify(datos.accesorios),
    enciende: datos.enciende || null,
    observaciones: datos.observaciones || null,
    servicio_id: datos.servicio_id || null,
    falla: datos.falla || null,
    presupuesto: datos.presupuesto || null,
    plazo: datos.plazo || null,
    firma_png: firma,
    firmada_en: firma ? creada_en : null,
  });

  const ordenId = Number(resultado.lastInsertRowid);
  datos.fotos.forEach((id, posicion) => insertarFoto.run(ordenId, id, posicion));
  insertarEvento.run(ordenId, "recibida", null, creada_en);
  return numero;
});

export function buscarPorNumero(numero: string): Orden | undefined {
  return db
    .prepare<[string], Orden>(`SELECT * FROM ordenes WHERE numero = ?`)
    .get(numero);
}

export function ultimasOrdenes(limite = 50): Orden[] {
  return db
    .prepare<[number], Orden>(
      `SELECT * FROM ordenes ORDER BY creada_en DESC, id DESC LIMIT ?`,
    )
    .all(limite);
}

export function accesoriosDe(orden: Orden): string[] {
  try {
    const valor: unknown = JSON.parse(orden.accesorios);
    return Array.isArray(valor) ? valor.map(String) : [];
  } catch {
    return [];
  }
}

export function fotosDe(orden: Orden): string[] {
  return db
    .prepare<[number], { archivo: string }>(
      `SELECT archivo FROM fotos WHERE orden_id = ? ORDER BY posicion, id`,
    )
    .all(orden.id)
    .map((fila) => fila.archivo);
}

export type Evento = {
  id: number;
  orden_id: number;
  estado: Estado;
  nota: string | null;
  creado_en: string;
};

export function eventosDe(ordenId: number): Evento[] {
  return db
    .prepare<[number], Evento>(
      `SELECT * FROM eventos WHERE orden_id = ? ORDER BY creado_en DESC, id DESC`,
    )
    .all(ordenId);
}

export function esEstado(valor: string): valor is Estado {
  return (ESTADOS as readonly string[]).includes(valor);
}

const actualizarEstado = db.prepare(
  `UPDATE ordenes SET estado = ?, entregada_en = ? WHERE id = ?`,
);

/**
 * Agrega una novedad y mueve el estado de la orden.
 *
 * `entregada_en` es el único campo con consecuencia: arranca el reloj de los
 * 30 días tras los cuales se borran las fotos sueltas del disco. Se cuenta
 * desde la entrega y no desde "lista para retirar" porque un equipo puede
 * quedar listo y que el cliente lo retire tres semanas después — borrar la
 * evidencia mientras todavía puede haber un reclamo sería justo al revés.
 */
export const agregarEvento = db.transaction(
  (ordenId: number, estado: Estado, nota: string): void => {
    const momento = ahora();
    insertarEvento.run(ordenId, estado, nota || null, momento);

    const orden = db
      .prepare<[number], { entregada_en: string | null }>(
        `SELECT entregada_en FROM ordenes WHERE id = ?`,
      )
      .get(ordenId);

    // Si se vuelve atrás desde "entregada" —pasa: el cliente la trae de nuevo
    // por lo mismo— el reloj de borrado se cancela.
    const entregada = estado === "entregada" ? (orden?.entregada_en ?? momento) : null;
    actualizarEstado.run(estado, entregada, ordenId);
  },
);

const marcarCorreo = db.prepare(
  `UPDATE ordenes SET email_estado = ?, email_enviado_en = ?, email_error = ? WHERE id = ?`,
);

export function registrarEnvio(
  ordenId: number,
  estado: "enviado" | "error" | "sin configurar",
  error?: string,
): void {
  marcarCorreo.run(estado, estado === "enviado" ? ahora() : null, error ?? null, ordenId);
}

/** Busca por número de orden y teléfono, para el seguimiento público. */
export function buscarParaSeguimiento(
  numero: string,
  telefono: string,
): Orden | undefined {
  const orden = buscarPorNumero(numero.trim().toUpperCase());
  if (!orden) return undefined;

  // Se comparan solo los dígitos: nadie escribe el teléfono dos veces con el
  // mismo formato, y los últimos ocho alcanzan para distinguir.
  const soloDigitos = (valor: string) => valor.replace(/\D/g, "");
  const guardado = soloDigitos(orden.cliente_telefono);
  const buscado = soloDigitos(telefono);
  if (buscado.length < 6) return undefined;

  return guardado.endsWith(buscado) || buscado.endsWith(guardado) ? orden : undefined;
}

export function buscarPorToken(token: string): Orden | undefined {
  return db.prepare<[string], Orden>(`SELECT * FROM ordenes WHERE token = ?`).get(token);
}
