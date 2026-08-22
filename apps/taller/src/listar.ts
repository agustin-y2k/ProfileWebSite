/**
 * Lista las órdenes en una tabla, para mirar desde la terminal de la Pi.
 *
 *   docker compose exec taller node --import tsx src/listar.ts
 *
 * El panel web ya muestra esto y mejor. Esto sirve para el momento en que hay
 * que decidir qué borrar, sin abrir el navegador ni pasar por Cloudflare.
 */
import { db } from "./db";
import { comoFechaHora } from "./fecha";

type Fila = {
  numero: string;
  creada_en: string;
  cliente_nombre: string;
  estado: string;
  email_estado: string;
  fotos: number;
};

const ordenes = db
  .prepare<[], Fila>(
    `SELECT o.numero, o.creada_en, o.cliente_nombre, o.estado, o.email_estado,
            (SELECT COUNT(*) FROM fotos WHERE fotos.orden_id = o.id) AS fotos
     FROM ordenes o
     ORDER BY o.creada_en DESC, o.id DESC`,
  )
  .all();

if (ordenes.length === 0) {
  console.log("\n  No hay ninguna orden cargada.\n");
} else {
  console.table(
    ordenes.map((orden) => ({
      Orden: orden.numero,
      Recibida: comoFechaHora(orden.creada_en),
      Cliente: orden.cliente_nombre,
      Estado: orden.estado,
      Correo: orden.email_estado,
      Fotos: orden.fotos,
    })),
  );
}
