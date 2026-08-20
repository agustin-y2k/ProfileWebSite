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
} as const;

export const navItems = [
  { id: "servicios", label: "Servicios" },
  { id: "precios", label: "Tarifas" },
  { id: "preguntas", label: "Preguntas" },
  { id: "contacto", label: "Contacto" },
] as const;

export const sectionIds = navItems.map((item) => item.id);
