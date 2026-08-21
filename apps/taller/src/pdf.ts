import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { site } from "@sites/negocio";
import { tarifaDe } from "@sites/negocio";
import { comoFechaHora } from "./fecha";
import { condiciones } from "./condiciones";
import { accesoriosDe, type Orden } from "./ordenes";

/**
 * Comprobante de recepción en PDF.
 *
 * El encabezado sale de `@sites/negocio`, el mismo módulo del que bytefix.shop
 * toma la dirección y el teléfono: un comprobante no puede decir algo distinto
 * de lo que dice la web.
 *
 * Ojo con lo que este documento es y lo que no es. La firma dibujada con el
 * dedo es una imagen adentro de un archivo editable, no una firma digital en
 * el sentido de la Ley 25.506. Lo que hace verificable al comprobante es el
 * registro del servidor —el hash SHA-256 que queda en la base— más la copia
 * del correo, no el PDF en sí.
 */

const A4: [number, number] = [595.28, 841.89];
const MARGEN = 48;
const ANCHO = A4[0] - MARGEN * 2;

const TINTA = rgb(0.06, 0.09, 0.13);
const GRIS = rgb(0.45, 0.5, 0.56);
const LINEA = rgb(0.85, 0.87, 0.9);
const ACENTO = rgb(0.02, 0.55, 0.65);

/**
 * Las fuentes estándar de PDF codifican en WinAnsi (cp1252), que cubre el
 * español entero pero nada más. Un nombre con un emoji o con un carácter
 * cirílico haría fallar la generación del comprobante entero, así que se
 * descarta lo que no se pueda representar en vez de romper.
 */
const EXTRA_CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

function limpiar(valor: string): string {
  return valor
    .normalize("NFC")
    .split("")
    .map((caracter) => {
      const punto = caracter.codePointAt(0) ?? 0;
      if (punto === 10 || punto === 13 || punto === 9) return " ";
      if (punto >= 0x20 && punto <= 0x7e) return caracter;
      if (punto >= 0xa1 && punto <= 0xff) return caracter;
      return EXTRA_CP1252.includes(caracter) ? caracter : "";
    })
    .join("");
}

function partir(texto: string, fuente: PDFFont, tamano: number, ancho: number): string[] {
  const palabras = limpiar(texto).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];

  const lineas: string[] = [];
  let actual = palabras[0] ?? "";

  for (const palabra of palabras.slice(1)) {
    const prueba = `${actual} ${palabra}`;
    if (fuente.widthOfTextAtSize(prueba, tamano) <= ancho) {
      actual = prueba;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  lineas.push(actual);
  return lineas;
}

export type FotoEnPdf = { id: string; jpeg: Buffer };

export async function construirComprobante(
  orden: Orden,
  fotos: FotoEnPdf[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.setTitle(`Comprobante de recepción ${orden.numero}`);
  doc.setProducer(`${site.name} — sistema de órdenes`);
  // Las dos fechas salen de la orden, no del reloj: con `ModDate` en "ahora",
  // dos generaciones del mismo comprobante darían bytes distintos y el hash
  // dejaría de servir para comparar contra la copia del cliente.
  doc.setCreationDate(new Date(orden.creada_en));
  doc.setModificationDate(new Date(orden.creada_en));

  let pagina: PDFPage = doc.addPage(A4);
  let y = A4[1] - MARGEN;

  const escribir = (
    texto: string,
    opciones: {
      x?: number;
      tamano?: number;
      fuente?: PDFFont;
      color?: ReturnType<typeof rgb>;
      ancho?: number;
      interlineado?: number;
    } = {},
  ) => {
    const tamano = opciones.tamano ?? 10;
    const fuente = opciones.fuente ?? regular;
    const x = opciones.x ?? MARGEN;
    const alto = opciones.interlineado ?? tamano * 1.35;

    for (const linea of partir(texto, fuente, tamano, opciones.ancho ?? ANCHO)) {
      pagina.drawText(linea, {
        x,
        y: y - tamano,
        size: tamano,
        font: fuente,
        color: opciones.color ?? TINTA,
      });
      y -= alto;
    }
  };

  const derecha = (texto: string, tamano: number, fuente: PDFFont, altura: number) => {
    const limpio = limpiar(texto);
    pagina.drawText(limpio, {
      x: A4[0] - MARGEN - fuente.widthOfTextAtSize(limpio, tamano),
      y: altura,
      size: tamano,
      font: fuente,
      color: TINTA,
    });
  };

  const regla = (separacion = 10) => {
    y -= separacion;
    pagina.drawLine({
      start: { x: MARGEN, y },
      end: { x: A4[0] - MARGEN, y },
      thickness: 0.75,
      color: LINEA,
    });
    y -= separacion;
  };

  // ── Encabezado ────────────────────────────────────────────────────────────
  const topeEncabezado = y;

  pagina.drawText(site.name, {
    x: MARGEN,
    y: y - 19,
    size: 19,
    font: negrita,
    color: ACENTO,
  });
  y -= 19 + 5;
  escribir(site.tagline, { tamano: 9, color: GRIS });
  y -= 2;
  escribir(site.street, { tamano: 8.5, color: GRIS, ancho: 260 });
  escribir(`${site.city}, ${site.region}`, { tamano: 8.5, color: GRIS, ancho: 260 });
  escribir(site.phone.display, { tamano: 8.5, color: GRIS, ancho: 260 });

  derecha("COMPROBANTE DE RECEPCIÓN", 8, regular, topeEncabezado - 9);
  derecha(orden.numero, 17, negrita, topeEncabezado - 30);
  derecha(comoFechaHora(orden.creada_en), 9, regular, topeEncabezado - 45);

  y = Math.min(y, topeEncabezado - 58);
  regla();

  // ── Bloques de datos ──────────────────────────────────────────────────────
  const ETIQUETA = 118;

  // El título se anota y se dibuja recién cuando aparece el primer dato de su
  // sección. Un "TRABAJO" solo, sin nada debajo, se lee como si el comprobante
  // hubiera salido incompleto — y con casi todos los campos opcionales, esa es
  // la situación normal, no la rara.
  let tituloPendiente: string | null = null;

  const titulo = (texto: string) => {
    tituloPendiente = texto;
  };

  const volcarTitulo = () => {
    if (tituloPendiente === null) return;
    y -= 6;
    escribir(tituloPendiente.toUpperCase(), {
      tamano: 8,
      fuente: negrita,
      color: ACENTO,
    });
    y -= 3;
    tituloPendiente = null;
  };

  const dato = (etiqueta: string, valor: string | null | undefined) => {
    if (!valor) return;
    volcarTitulo();

    const lineas = partir(valor, regular, 10, ANCHO - ETIQUETA);
    const altoBloque = Math.max(lineas.length, 1) * 13.5;

    // Si el bloque no entra completo, se pasa a una hoja nueva antes de
    // empezarlo: una etiqueta al pie de una página y su valor en la siguiente
    // se lee como si faltara el dato.
    if (y - altoBloque < MARGEN + 40) {
      pagina = doc.addPage(A4);
      y = A4[1] - MARGEN;
    }

    pagina.drawText(limpiar(etiqueta), {
      x: MARGEN,
      y: y - 10,
      size: 8.5,
      font: regular,
      color: GRIS,
    });
    escribir(valor, {
      x: MARGEN + ETIQUETA,
      ancho: ANCHO - ETIQUETA,
      interlineado: 13.5,
    });
    y -= 3;
  };

  titulo("Cliente");
  dato("Nombre", orden.cliente_nombre);
  dato("Teléfono", orden.cliente_telefono);
  dato("Correo", orden.cliente_email);
  dato("DNI", orden.cliente_dni);

  const equipo = [orden.equipo_tipo, orden.marca, orden.modelo].filter(Boolean).join(" ");
  const accesorios = accesoriosDe(orden);

  titulo("Equipo");
  dato("Equipo", equipo || "Sin describir");
  dato("Número de serie", orden.serie);
  dato("Se recibe con", accesorios.length > 0 ? accesorios.join(", ") : null);
  dato("¿Enciende?", orden.enciende);
  dato("Estado al recibirlo", orden.observaciones);
  if (fotos.length > 0) {
    dato(
      "Fotos",
      `${fotos.length} ${fotos.length === 1 ? "foto adjunta" : "fotos adjuntas"} al final de este comprobante`,
    );
  }

  const servicio = orden.servicio_id ? tarifaDe(orden.servicio_id) : undefined;

  titulo("Trabajo");
  dato("Servicio", servicio?.service);
  dato("Falla reportada", orden.falla);
  dato("Presupuesto estimado", orden.presupuesto);
  dato("Plazo estimado", orden.plazo);

  regla(14);

  // ── Firma o constancia de envío ───────────────────────────────────────────
  if (y < MARGEN + 190) {
    pagina = doc.addPage(A4);
    y = A4[1] - MARGEN;
  }

  if (orden.firma_png) {
    const imagen = await doc.embedPng(orden.firma_png);
    const escala = Math.min(190 / imagen.width, 62 / imagen.height);
    const ancho = imagen.width * escala;
    const alto = imagen.height * escala;

    y -= 8;
    pagina.drawImage(imagen, { x: MARGEN, y: y - alto, width: ancho, height: alto });
    y -= alto + 4;

    pagina.drawLine({
      start: { x: MARGEN, y },
      end: { x: MARGEN + 210, y },
      thickness: 0.75,
      color: LINEA,
    });
    y -= 12;
    escribir("Firma del cliente", { tamano: 8.5, color: GRIS });
    if (orden.firmada_en) {
      escribir(comoFechaHora(orden.firmada_en), { tamano: 8, color: GRIS });
    }
  } else {
    // Sin firma no se dibuja un recuadro vacío: parecería un comprobante a
    // medio hacer. Queda constancia de la otra vía por la que el cliente lo
    // recibió, que es la que de verdad deja rastro.
    escribir("Recepción sin firma en pantalla.", { tamano: 9, color: GRIS });
    escribir(
      `Este comprobante se envía por correo electrónico a ${orden.cliente_email}.`,
      { tamano: 9, color: GRIS },
    );
  }

  // ── Condiciones ───────────────────────────────────────────────────────────
  if (condiciones.length > 0) {
    if (y < MARGEN + 90) {
      pagina = doc.addPage(A4);
      y = A4[1] - MARGEN;
    }
    regla(12);
    escribir("CONDICIONES", { tamano: 7.5, fuente: negrita, color: GRIS });
    y -= 2;
    for (const condicion of condiciones) {
      escribir(`·  ${condicion}`, { tamano: 7.5, color: GRIS, interlineado: 10 });
      y -= 2;
    }
  }

  // ── Fotos ─────────────────────────────────────────────────────────────────
  if (fotos.length > 0) {
    const columnas = 2;
    const separacion = 14;
    const anchoCelda = (ANCHO - separacion) / columnas;
    const altoCelda = 210;

    const encabezarPagina = (hoja: PDFPage) => {
      hoja.drawText(limpiar(`Estado del equipo al recibirlo — ${orden.numero}`), {
        x: MARGEN,
        y: A4[1] - MARGEN - 12,
        size: 11,
        font: negrita,
        color: TINTA,
      });
    };

    let hoja = doc.addPage(A4);
    encabezarPagina(hoja);
    let filaY = A4[1] - MARGEN - 30;
    let columna = 0;

    for (const foto of fotos) {
      if (columna >= columnas) {
        columna = 0;
        filaY -= altoCelda + separacion;
      }

      // Se abre hoja nueva en vez de cortar el recorrido: descartar en
      // silencio justo la foto que documenta el golpe sería el peor error
      // posible de este documento.
      if (filaY - altoCelda < MARGEN) {
        hoja = doc.addPage(A4);
        encabezarPagina(hoja);
        filaY = A4[1] - MARGEN - 30;
        columna = 0;
      }

      let imagen;
      try {
        imagen = await doc.embedJpg(foto.jpeg);
      } catch {
        // Una foto ilegible no puede impedir que se emita el comprobante, y
        // tampoco tiene que consumir una celda: se saltea sin avanzar.
        continue;
      }

      // `contain`: la foto entra entera en la celda. Recortarla podría dejar
      // afuera justo la marca que se quiso documentar.
      const escala = Math.min(anchoCelda / imagen.width, altoCelda / imagen.height);
      const ancho = imagen.width * escala;
      const alto = imagen.height * escala;

      hoja.drawImage(imagen, {
        x: MARGEN + columna * (anchoCelda + separacion) + (anchoCelda - ancho) / 2,
        y: filaY - alto,
        width: ancho,
        height: alto,
      });

      columna++;
    }
  }

  return await doc.save();
}
