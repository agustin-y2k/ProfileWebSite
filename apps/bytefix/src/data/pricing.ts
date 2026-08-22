/**
 * La tarifa vive en `@sites/negocio`: la comparte con el sistema de órdenes,
 * que la usa para completar el presupuesto de referencia al recibir un equipo.
 * Si el precio cambia acá, cambia en el comprobante que firma el cliente.
 */
export { pricing } from "@sites/negocio";
export type { PriceRow } from "@sites/negocio";
