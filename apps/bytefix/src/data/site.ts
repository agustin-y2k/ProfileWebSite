/**
 * Los datos del negocio viven en `@sites/negocio`, compartidos con el sistema
 * de órdenes de servicio: el encabezado de cada comprobante sale de ahí, así
 * que una dirección o un teléfono nuevos se actualizan en un solo lugar.
 *
 * Lo que queda acá es lo que sí es propio del sitio: su navegación.
 */
export { site } from "@sites/negocio";

export const navItems = [
  { id: "servicios", label: "Servicios" },
  { id: "precios", label: "Tarifas" },
  { id: "preguntas", label: "Preguntas" },
  { id: "contacto", label: "Contacto" },
] as const;

export const sectionIds = navItems.map((item) => item.id);
