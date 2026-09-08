import { IDIOMAS, prefijo, type Idioma } from "./idioma";

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
 * son la misma página en dos idiomas y no contenido duplicado compitiendo
 * entre sí. Sin eso, publicar una traducción puede hundir el posicionamiento
 * del original.
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
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Ramiro Agustín Pintos",
  alternateName: "Ramiro Agustín",
  url: `${SITIO}/`,
  email: "mailto:agustin.y2k@gmail.com",
  telephone: "+54-9-260-431-6731",
  address: {
    "@type": "PostalAddress",
    addressLocality: "San Rafael",
    addressRegion: "Mendoza",
    addressCountry: "AR",
  },
  owns: {
    "@type": "Organization",
    name: "ByteFix",
    url: "https://bytefix.shop/",
  },
};

export const META: Record<Pagina, Record<Idioma, Meta>> = {
  inicio: {
    es: {
      titulo: "Ramiro Agustín — Programador",
      descripcion:
        "Ramiro Agustín, programador y estudiante de Ingeniería en Informática en San Rafael, Mendoza. Reparación de equipos, desarrollo de software y redes que se sostienen en el día a día.",
      ogTitulo: "Ramiro Agustín — Programador",
      ogDescripcion:
        "Reparación de equipos, desarrollo de software y redes. San Rafael, Mendoza.",
      jsonLd: {
        ...PERSONA,
        jobTitle: "Programador",
        knowsAbout: ["Reparación de computadoras", "Desarrollo de software", "Redes"],
      },
    },
    en: {
      titulo: "Ramiro Agustín — Software Developer",
      descripcion:
        "Ramiro Agustín, software developer and Computer Engineering student in San Rafael, Argentina. Hardware repair, software development, and networks that hold up day to day.",
      ogTitulo: "Ramiro Agustín — Software Developer",
      ogDescripcion:
        "Hardware repair, software development and networking. San Rafael, Argentina.",
      jsonLd: {
        ...PERSONA,
        jobTitle: "Software Developer",
        knowsAbout: ["Computer repair", "Software development", "Computer networks"],
      },
    },
  },
  algoritmos: {
    es: {
      titulo: "Doce algoritmos, paso a paso — Ramiro Agustín",
      descripcion:
        "Doce algoritmos de redes, estructuras e inteligencia artificial, animados paso a paso y con el código sincronizado. Spanning Tree, Dijkstra, A*, minimax con poda alfa-beta y k-means.",
      ogTitulo: "Doce algoritmos, paso a paso",
      ogDescripcion:
        "Redes, estructuras e IA animados con el código al lado, y los escenarios donde cada uno falla.",
    },
    en: {
      titulo: "Twelve Algorithms, Step by Step — Ramiro Agustín",
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
