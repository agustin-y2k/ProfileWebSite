import { readFileSync } from "node:fs";
import { createTransport, type Transporter } from "nodemailer";
import { site } from "@sites/negocio";
import { config, correoConfigurado } from "./config";
import { asegurarComprobante } from "./comprobante";
import { buscarPorNumero, registrarEnvio, type Orden } from "./ordenes";

/**
 * Envío del comprobante por correo.
 *
 * El correo no es un accesorio del sistema: es la pieza que de verdad hace
 * auditable al comprobante. Queda con fecha en la casilla del cliente y en la
 * de ByteFix, firmado con DKIM por el servidor que lo despachó, y ninguna de
 * las dos partes lo puede alterar después. También es, de hecho, la copia de
 * respaldo de las fotos: siguen adentro del PDF cuando las sueltas se borren.
 *
 * Nada de esto bloquea la carga de una orden. Se guarda, se responde, y el
 * correo sale después con reintentos.
 */

let transporte: Transporter | null = null;

function obtenerTransporte(): Transporter {
  if (!transporte) {
    transporte = createTransport({
      host: config.smtp.host,
      port: config.smtp.puerto,
      // 465 es SMTPS directo; 587 arranca en claro y sube con STARTTLS.
      secure: config.smtp.puerto === 465,
      auth: { user: config.smtp.usuario, pass: config.smtp.clave },
    });
  }
  return transporte;
}

function enlaceDeSeguimiento(orden: Orden): string | null {
  return config.urlPublica ? `${config.urlPublica}/s/${orden.token}` : null;
}

function cuerpo(orden: Orden): { texto: string; html: string } {
  const equipo =
    [orden.equipo_tipo, orden.marca, orden.modelo].filter(Boolean).join(" ") ||
    "tu equipo";
  const enlace = enlaceDeSeguimiento(orden);

  const lineas = [
    `Hola ${orden.cliente_nombre.split(" ")[0] ?? ""},`.trim(),
    "",
    `Recibimos ${equipo}. El número de orden es ${orden.numero}: con ese número te podés referir al trabajo en cualquier momento.`,
    "",
    "Adjunto va el comprobante de recepción en PDF, con el detalle de lo que se recibió y en qué estado.",
  ];

  if (enlace) {
    lineas.push(
      "",
      "Podés seguir cómo va la reparación acá:",
      enlace,
      "",
      `Si perdés este correo, entrá a ${config.urlPublica}/seguimiento con el número de orden y tu teléfono.`,
    );
  }

  lineas.push(
    "",
    `Cualquier duda, escribinos por WhatsApp al ${site.phone.display}.`,
    "",
    `${site.name} — ${site.tagline}`,
    site.street,
    `${site.city}, ${site.region}`,
  );

  const texto = lineas.join("\n");

  const escapar = (valor: string) =>
    valor.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);

  // El número va en un recuadro propio y además en el texto. Es el dato que el
  // cliente va a volver a buscar dentro de tres semanas, y en un correo leído
  // en el celular una línea más de párrafo se pasa de largo.
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#111827">
<p>Hola ${escapar(orden.cliente_nombre.split(" ")[0] ?? "")},</p>
<p>Recibimos <strong>${escapar(equipo)}</strong>.</p>
<div style="margin:20px 0;padding:16px;border:1px solid #d1d5db;border-radius:10px;text-align:center;background:#f9fafb">
  <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280">Número de orden</div>
  <div style="font-size:26px;font-weight:700;letter-spacing:0.04em;color:#0e7490;padding-top:4px">${escapar(orden.numero)}</div>
</div>
<p>Con ese número te podés referir al trabajo en cualquier momento.</p>
<p>Adjunto va el comprobante de recepción en PDF, con el detalle de lo que se recibió y en
qué estado.</p>
${
  enlace
    ? `<p><a href="${escapar(enlace)}" style="display:inline-block;padding:11px 18px;border-radius:8px;background:#0e7490;color:#fff;text-decoration:none;font-weight:600">Seguir el estado de mi equipo</a></p>
<p style="font-size:13px;color:#6b7280">Si perdés este correo, entrá a
<a href="${escapar(config.urlPublica)}/seguimiento">${escapar(config.urlPublica)}/seguimiento</a>
con el número de orden y tu teléfono.</p>`
    : ""
}
<p>Cualquier duda, escribinos por WhatsApp al ${escapar(site.phone.display)}.</p>
<p style="font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:12px">
${escapar(site.name)} — ${escapar(site.tagline)}<br />
${escapar(site.street)}<br />${escapar(site.city)}, ${escapar(site.region)}</p>
</div>`;

  return { texto, html };
}

async function enviar(orden: Orden): Promise<void> {
  const ruta = await asegurarComprobante(orden.numero);
  const { texto, html } = cuerpo(orden);

  await obtenerTransporte().sendMail({
    from: { name: config.smtp.nombre, address: config.smtp.usuario },
    to: orden.cliente_email,
    // Copia oculta para Ramiro: queda en Recibidos, etiquetable y buscable, no
    // solo en Enviados.
    ...(config.smtp.copia ? { bcc: config.smtp.copia } : {}),
    replyTo: config.smtp.usuario,
    subject: `${site.name} — Comprobante de recepción ${orden.numero}`,
    text: texto,
    html,
    ...(ruta
      ? {
          attachments: [
            {
              filename: `${orden.numero}.pdf`,
              content: readFileSync(ruta),
              contentType: "application/pdf",
            },
          ],
        }
      : {}),
  });
}

const ESPERAS_MS = [0, 30_000, 5 * 60_000, 30 * 60_000];

/**
 * Encola el envío con reintentos y espera creciente.
 *
 * Se hace en memoria a propósito: si el proceso se cae en el medio, el correo
 * queda marcado como pendiente y se reintenta con el botón "Reenviar" del
 * detalle. Una cola persistente para un envío por orden sería más máquina de
 * la que hace falta.
 */
export function encolarComprobante(
  numero: string,
  registrar: (mensaje: string, datos?: Record<string, unknown>) => void,
): void {
  if (!correoConfigurado) {
    const orden = buscarPorNumero(numero);
    if (orden) registrarEnvio(orden.id, "sin configurar");
    return;
  }

  const intentar = async (intento: number): Promise<void> => {
    const orden = buscarPorNumero(numero);
    if (!orden) return;

    try {
      await enviar(orden);
      registrarEnvio(orden.id, "enviado");
      registrar("comprobante enviado", { numero, intento });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      registrarEnvio(orden.id, "error", mensaje);
      registrar("falló el envío del comprobante", { numero, intento, error: mensaje });

      const espera = ESPERAS_MS[intento + 1];
      if (espera !== undefined) {
        // `unref`: un reintento pendiente no tiene que impedir que el proceso
        // termine cuando Docker lo para.
        setTimeout(() => void intentar(intento + 1), espera).unref();
      }
    }
  };

  void intentar(0);
}
