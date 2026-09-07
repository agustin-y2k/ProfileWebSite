/* De una lista de archivos a los `srcSet` que sirve la galería.

   Vive aparte de capturas.ts porque acá no hay `import.meta.glob` ni archivos
   en disco: entra un objeto de rutas y sale la agrupación, así que se puede
   probar con nombres inventados. */

/** La página entera, el recorte de escritorio y el del teléfono. */
export type Version = "completa" | "detalle" | "foco";

export type Formato = "avif" | "webp" | "jpg";

/** Lo que dice el nombre de un archivo de captura. */
export type Analisis = {
  id: string;
  version: Version;
  ancho: string;
  formato: Formato;
};

/**
 * `01-mostrador-1800.avif` es la página entera; `01-mostrador-foco-450.webp`,
 * un recorte.
 *
 * El `+?` evita que el id se coma la palabra de la versión: sin él,
 * `01-mostrador-foco-450` también encaja leyendo el id como
 * `01-mostrador-foco`. Las dos lecturas le sirven al motor y la perezosa es la
 * que acierta. El test lo fija, porque cambiarlo no rompe nada a la vista: las
 * capturas se archivan bajo la versión equivocada y listo.
 */
const NOMBRE = /([^/]+?)(?:-(detalle|foco))?-(\d+)\.(avif|webp|jpg)$/;

/** `null` si el nombre no es el de una captura. */
export function analizarNombre(ruta: string): Analisis | null {
  const partes = NOMBRE.exec(ruta);
  const id = partes?.[1];
  const ancho = partes?.[3];
  const formato = partes?.[4] as Formato | undefined;
  if (!id || !ancho || !formato) return null;

  return {
    id,
    // Sin palabra de versión en el nombre, es la página entera.
    version: (partes?.[2] ?? "completa") as Version,
    ancho,
    formato,
  };
}

export type Agrupacion = {
  /** Un `srcSet` por formato, indexado por `<id>:<versión>`. */
  fuentes: Map<string, Record<Formato, string[]>>;
  /** La URL del jpg suelta, para el `src` del `img`. Hay un solo ancho en jpg. */
  respaldos: Map<string, string>;
};

/** La clave con la que se guarda cada versión de cada captura. */
export const clave = (id: string, version: Version) => `${id}:${version}`;

/** Una versión lista para servir: los tres `srcSet` y el tamaño del archivo. */
export type Juego = {
  avif: string;
  webp: string;
  jpg: string;
  /** `src` del `img`; el navegador que ignore los `srcSet` recibe este. */
  respaldo: string;
  ancho: number;
  alto: number;
};

/** Lo que escribió el script: `[ancho, alto]` por captura y versión. */
export type Tabla = Record<string, Partial<Record<Version, number[]>> | undefined>;

/**
 * Junta lo que salió de los archivos con lo que dice la tabla de medidas, y
 * exige que esté todo.
 *
 * Que falte algo no es un caso a contemplar sino un error de quien preparó las
 * capturas: media versión no se puede servir. Como esto corre al armar la
 * lista, y `pnpm build` la prerrenderiza, el que se entera es el build y no
 * quien entra al sitio. El mensaje dice qué falta y qué hay que correr, porque
 * lo va a leer alguien que quizá no tocó este archivo nunca.
 */
export function lectorDeJuegos({ fuentes, respaldos }: Agrupacion, tabla: Tabla) {
  return (id: string, version: Version): Juego => {
    const fuente = fuentes.get(clave(id, version));
    const respaldo = respaldos.get(clave(id, version));
    const [ancho, alto] = tabla[id]?.[version] ?? [];

    if (!fuente || !respaldo || ancho === undefined || alto === undefined) {
      throw new Error(
        `Falta la versión "${version}" de la captura "${id}". ` +
          `Corré scripts/capturas.sh con el docs/capturas del repo de SGRC.`,
      );
    }

    return {
      avif: fuente.avif.join(", "),
      webp: fuente.webp.join(", "),
      jpg: fuente.jpg.join(", "),
      respaldo,
      ancho,
      alto,
    };
  };
}

/** Recibe `{ ruta: url }` y agrupa. Los que no son capturas se ignoran. */
export function agruparArchivos(archivos: Record<string, string>): Agrupacion {
  const fuentes: Agrupacion["fuentes"] = new Map();
  const respaldos: Agrupacion["respaldos"] = new Map();

  for (const [ruta, url] of Object.entries(archivos)) {
    const dato = analizarNombre(ruta);
    if (!dato) continue;

    const k = clave(dato.id, dato.version);
    const juego = fuentes.get(k) ?? { avif: [], webp: [], jpg: [] };
    juego[dato.formato].push(`${url} ${dato.ancho}w`);
    fuentes.set(k, juego);

    if (dato.formato === "jpg") respaldos.set(k, url);
  }

  return { fuentes, respaldos };
}
