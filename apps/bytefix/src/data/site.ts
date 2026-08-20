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
} as const;

export const navItems = [
  { id: "servicios", label: "Servicios" },
  { id: "precios", label: "Tarifas" },
  { id: "preguntas", label: "Preguntas" },
  { id: "contacto", label: "Contacto" },
] as const;

export const sectionIds = navItems.map((item) => item.id);
