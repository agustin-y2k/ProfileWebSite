/**
 * Datos de contacto e identidad en un solo lugar.
 * Cambiar un teléfono no debería obligar a buscarlo por seis componentes.
 */
export const site = {
  name: "Ramiro Agustín",
  role: "Ingeniero en informática",
  location: "San Rafael, Mendoza",
  email: "agustin.y2k@gmail.com",
  phone: { display: "+54 9 260 431-6731", href: "tel:+5492604316731" },
  bytefix: "https://bytefix.shop",
  github: "https://github.com/agustin-y2k",
  /** El repositorio de este mismo sitio, enlazado desde el colofón. */
  repo: "https://github.com/agustin-y2k/ProfileWebSite",
} as const;

export const navItems = [
  { id: "trabajo", label: "Lo que hago" },
  { id: "sobre", label: "Sobre mí" },
  { id: "colofon", label: "Este sitio" },
  { id: "contacto", label: "Contacto" },
] as const;

export const sectionIds = navItems.map((item) => item.id);
