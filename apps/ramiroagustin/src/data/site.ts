import type { Frase } from "../i18n/idioma";

/**
 * Datos de contacto e identidad en un solo lugar.
 * Cambiar un teléfono no debería obligar a buscarlo por seis componentes.
 *
 * Lo que no lleva `Frase` es porque no se traduce: un correo, un teléfono y
 * una URL son los mismos en cualquier idioma.
 */
export const site = {
  name: "Ramiro Agustín",
  role: {
    es: "Programador · Estudiante de Ingeniería en Informática",
    en: "Software Developer · Computer Engineering Student",
  } satisfies Frase,
  // En inglés la provincia no ubica a nadie; el país, sí.
  location: {
    es: "San Rafael, Mendoza",
    en: "San Rafael, Argentina",
  } satisfies Frase,
  email: "agustin.y2k@gmail.com",
  phone: { display: "+54 9 260 431-6731", href: "tel:+5492604316731" },
  bytefix: "https://bytefix.shop",
  github: "https://github.com/agustin-y2k",
  /** El repositorio de este mismo sitio, enlazado desde el pie. */
  repo: "https://github.com/agustin-y2k/ProfileWebSite",
} as const;

/**
 * El `id` es también el ancla de la sección, así que no cambia con el idioma:
 * `#trabajo` es `#trabajo` en las dos versiones. Traducir el ancla rompería
 * cualquier enlace profundo que alguien haya guardado.
 */
export const navItems: readonly { id: string; label: Frase }[] = [
  { id: "trabajo", label: { es: "Lo que hago", en: "What I do" } },
  { id: "sobre", label: { es: "Sobre mí", en: "About" } },
  { id: "proyectos", label: { es: "Proyectos", en: "Projects" } },
  { id: "contacto", label: { es: "Contacto", en: "Contact" } },
];

export const sectionIds = navItems.map((item) => item.id);
