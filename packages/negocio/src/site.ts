/**
 * Datos del negocio: una sola fuente de verdad.
 *
 * Vive en un paquete compartido y no dentro de `apps/bytefix` porque hay dos
 * consumidores: el sitio público y el sistema de órdenes de servicio, que
 * imprime esta misma información en el encabezado de cada comprobante. Un
 * comprobante con una dirección o un teléfono viejo es exactamente el problema
 * que tienen los talonarios de papel.
 */
const PHONE_E164 = "5492604316731";

export const site = {
  name: "ByteFix",
  tagline: "Soluciones Informáticas",
  city: "San Rafael",
  region: "Mendoza",
  street: "Dr. Carlos Pellegrini 1157, depto. 3",
  phone: { display: "+54 9 260 431-6731", href: `tel:+${PHONE_E164}` },
  /** El texto prellenado sube mucho la tasa de respuesta: la persona no
   *  tiene que redactar el primer mensaje. */
  whatsapp: `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(
    "Hola ByteFix, quería consultar por un servicio.",
  )}`,
  owner: "Ramiro Agustín",
  ownerSite: "https://ramiroagustin.online",

  /**
   * Enlace a Google Maps construido desde la dirección.
   *
   * Se usa un link y no un iframe embebido a propósito: el iframe cargaría
   * scripts de Google en la página —lo que además choca con la CSP— y suma
   * cientos de KB para algo que la mayoría abre en su app de mapas igual.
   */
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    "Dr. Carlos Pellegrini 1157, San Rafael, Mendoza, Argentina",
  )}`,

  /**
   * Horario de atención.
   *
   * `null` a propósito: no hay un horario confirmado y publicar uno inventado
   * haría que alguien viaje hasta el taller y lo encuentre cerrado. Mientras
   * sea null, la ficha de contacto muestra que se coordina por WhatsApp, que
   * es como se trabaja hoy.
   *
   * Para publicarlo, reemplazar por algo como:
   *   hours: "Lunes a viernes de 9 a 13 y de 17 a 20 h",
   */
  hours: null as string | null,

  /**
   * Panel público donde un cliente sigue el estado de su reparación.
   *
   * `null` a propósito hasta que el subdominio esté publicado en el túnel de
   * Cloudflare. Mientras sea null, la sección de seguimiento de bytefix.shop
   * directamente no se renderiza: un botón que lleva a un dominio que no
   * resuelve es peor que no tener el botón.
   *
   * Para publicarlo, reemplazar por:
   *   seguimiento: "https://taller.bytefix.shop/seguimiento",
   */
  seguimiento: null as string | null,
} as const;
