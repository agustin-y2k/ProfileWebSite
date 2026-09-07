/* ─────────────────────────────────────────────────────────────────────────────
   De una lista de archivos a los `srcSet` que sirve la galería.

   Vive aparte de capturas.ts por una sola razón: acá no hay `import.meta.glob`
   ni archivos en disco. Entra un objeto de rutas y sale la agrupación, así que
   se puede probar con nombres inventados —incluidos los que no existen todavía
   pero van a existir el día que alguien agregue una captura— sin generar
   quince archivos de imagen para cada caso.
   ────────────────────────────────────────────────────────────────────────── */

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
 * El id lleva guiones y termina en cualquier cosa, así que el `+?` es lo que
 * evita que se coma la palabra de la versión: sin él, `01-mostrador-foco-450`
 * también encaja leyendo el id como `01-mostrador-foco` y la versión como la
 * página entera. Las dos lecturas son válidas para el motor; la perezosa es la
 * que prueba primero el id más corto y acierta. Hay un test que lo fija,
 * porque el día que alguien saque ese signo de pregunta nada va a explotar:
 * las capturas simplemente se archivan bajo la versión equivocada.
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
