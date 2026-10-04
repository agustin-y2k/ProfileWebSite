import { IDIOMAS, prefijo, type Idioma } from "./idioma";
import { site } from "../data/site";

/**
 * Todo lo que va en el `<head>` y cambia según la página y el idioma.
 *
 * No está escrito en los `index.html` porque entonces habría cuatro cabeceras
 * casi iguales —dos páginas por dos idiomas— y mantenerlas sincronizadas a
 * mano es exactamente el trabajo que nadie hace. Los HTML llevan un marcador
 * `<!--meta-->` y `scripts/prerender.mjs` arma este bloque por cada
 * combinación, así que una página nueva es una entrada acá y nada más.
 *
 * El `hreflang` no es decorativo: es lo que le dice a Google que `/` y `/en/`
 * son versiones de una página en dos idiomas y ayuda a elegir la apropiada.
 */

export const SITIO = "https://ramiroagustin.online";

export type Pagina = "inicio" | "algoritmos";

/** El camino de cada página, sin el prefijo de idioma. Con barra al final. */
export const RUTAS: Record<Pagina, string> = {
  inicio: "/",
  algoritmos: "/algoritmos/",
};

/**
 * El CV no es una página de React: es un documento autocontenido de `public/`,
 * sin marcador de prerender y con `noindex`. Vive fuera de `RUTAS` a propósito
 * —si estuviera ahí, el prerender intentaría renderizarlo y fallaría— pero
 * igual tiene una versión por idioma, porque es justo lo que abre quien llega
 * al sitio en inglés.
 */
export const CV: Record<Idioma, string> = { es: "/cv", en: "/en/cv" };

export type Meta = {
  titulo: string;
  descripcion: string;
  ogTitulo: string;
  ogDescripcion: string;
  /** Solo la portada la lleva: describe a la persona, no a la página. */
  jsonLd?: object;
};

const PERSONA = {
  "@type": "Person",
  "@id": `${SITIO}/#persona`,
  name: site.fullName,
  alternateName: [...site.alternateNames],
  url: `${SITIO}/`,
  image: `${SITIO}/img/retrato.jpg`,
  sameAs: [site.github],
  email: `mailto:${site.email}`,
  telephone: site.phone.href.replace("tel:", ""),
  address: {
    "@type": "PostalAddress",
    addressLocality: "San Rafael",
    addressRegion: "Mendoza",
    addressCountry: "AR",
  },
  worksFor: {
    "@type": "Organization",
    name: "ByteFix",
    url: site.bytefix,
  },
};

function perfil(idioma: Idioma) {
  const url = `${SITIO}${prefijo(idioma)}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITIO}/#sitio`,
        url: `${SITIO}/`,
        name: site.name,
        alternateName: site.shortName,
        inLanguage: [...IDIOMAS],
        publisher: { "@id": PERSONA["@id"] },
      },
      {
        ...PERSONA,
        jobTitle: idioma === "es" ? "Programador" : "Software Developer",
        knowsAbout:
          idioma === "es"
            ? ["Desarrollo de software", "Reparación de computadoras", "Redes"]
            : ["Software development", "Computer repair", "Computer networks"],
      },
      {
        "@type": "ProfilePage",
        "@id": `${url}#perfil`,
        url,
        name: site.name,
        inLanguage: idioma,
        isPartOf: { "@id": `${SITIO}/#sitio` },
        mainEntity: { "@id": PERSONA["@id"] },
      },
    ],
  };
}

export const META: Record<Pagina, Record<Idioma, Meta>> = {
  inicio: {
    es: {
      titulo: `${site.fullName} — Programador`,
      descripcion: `${site.fullName}, conocido como ${site.name}. Programador y estudiante de Ingeniería en Informática en San Rafael, Mendoza. Software y automatizaciones.`,
      ogTitulo: `${site.name} — Programador`,
      ogDescripcion:
        "Reparación de equipos, desarrollo de software y redes. San Rafael, Mendoza.",
      jsonLd: perfil("es"),
    },
    en: {
      titulo: `${site.fullName} — Software Developer`,
      descripcion: `${site.fullName}, also known as ${site.name}. Software developer and Computer Engineering student in San Rafael, Argentina. Software and automation.`,
      ogTitulo: `${site.name} — Software Developer`,
      ogDescripcion:
        "Hardware repair, software development and networking. San Rafael, Argentina.",
      jsonLd: perfil("en"),
    },
  },
  algoritmos: {
    es: {
      titulo: `Doce algoritmos, paso a paso — ${site.fullName}`,
      descripcion:
        "Doce algoritmos de redes, estructuras e inteligencia artificial, animados paso a paso y con el código sincronizado. Spanning Tree, Dijkstra, A*, minimax con poda alfa-beta y k-means.",
      ogTitulo: "Doce algoritmos, paso a paso",
      ogDescripcion:
        "Redes, estructuras e IA animados con el código al lado, y los escenarios donde cada uno falla.",
    },
    en: {
      titulo: `Twelve Algorithms, Step by Step — ${site.fullName}`,
      descripcion:
        "Twelve algorithms from networking, data structures and AI, animated step by step with the code in sync. Spanning Tree, Dijkstra, A*, alpha-beta minimax and k-means.",
      ogTitulo: "Twelve Algorithms, Step by Step",
      ogDescripcion:
        "Networking, data structures and AI animated with the code alongside, and the scenarios where each one breaks.",
    },
  },
};

/** El `og:locale` de cada idioma. Facebook exige territorio, no solo idioma. */
const OG_LOCALE: Record<Idioma, string> = { es: "es_AR", en: "en_US" };

const escapar = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * El bloque entero que reemplaza a `<!--meta-->`, ya indentado para que el
 * HTML servido se pueda leer sin pelearse con él.
 */
export function bloqueMeta(pagina: Pagina, idioma: Idioma): string {
  const meta = META[pagina][idioma];
  const url = `${SITIO}${prefijo(idioma)}${RUTAS[pagina]}`;

  const lineas = [
    `<title>${escapar(meta.titulo)}</title>`,
    `<meta name="description" content="${escapar(meta.descripcion)}" />`,
    `<meta name="author" content="${escapar(site.fullName)}" />`,
    `<link rel="canonical" href="${url}" />`,
    "",
    // Una etiqueta por idioma más `x-default`, que es la que le dice al
    // buscador qué servir cuando no reconoce el idioma de quien busca.
    ...IDIOMAS.map(
      (otro) =>
        `<link rel="alternate" hreflang="${otro}" href="${SITIO}${prefijo(otro)}${RUTAS[pagina]}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${SITIO}${RUTAS[pagina]}" />`,
    "",
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:site_name" content="${escapar(site.name)}" />`,
    `<meta property="og:title" content="${escapar(meta.ogTitulo)}" />`,
    `<meta property="og:description" content="${escapar(meta.ogDescripcion)}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[idioma]}" />`,
    ...IDIOMAS.filter((otro) => otro !== idioma).map(
      (otro) => `<meta property="og:locale:alternate" content="${OG_LOCALE[otro]}" />`,
    ),
  ];

  if (meta.jsonLd) {
    lineas.push(
      "",
      `<script type="application/ld+json">`,
      JSON.stringify(meta.jsonLd, null, 2),
      `</script>`,
    );
  }

  return lineas
    .map((l) => (l ? `    ${l}` : ""))
    .join("\n")
    .trim();
}
