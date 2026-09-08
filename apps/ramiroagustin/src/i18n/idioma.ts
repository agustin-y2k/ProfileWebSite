/**
 * Los dos idiomas del sitio, y la única forma de escribir algo traducible.
 *
 * La decisión de fondo: **las dos versiones de una frase viven pegadas**. No
 * hay archivo de claves ni `t("hero.titulo")` que haya que ir a buscar a otro
 * lado. Un diccionario aparte se desincroniza en silencio —alguien edita el
 * español, el inglés queda viejo y nada falla— y encima obliga a leer el
 * código con dos archivos abiertos. Acá, si una frase cambia, la otra está en
 * la línea de al lado.
 *
 * El costo de esta decisión es que no se puede agregar un tercer idioma sin
 * tocar cada frase. Es a propósito: son dos, y un sitio personal que sume un
 * tercero tiene un problema distinto al que este archivo resuelve.
 */

export const IDIOMAS = ["es", "en"] as const;

export type Idioma = (typeof IDIOMAS)[number];

/**
 * Un texto que puede mostrarse.
 *
 * Cuando es un objeto, lleva las dos versiones. Cuando es una cadena pelada
 * significa **«esto no se traduce»**: un número, el nombre de un nodo, una
 * sigla, `OSPF`, `SW-A`, `f = g + h`. Esa distinción es información real —
 * dice que alguien miró la cadena y decidió que es igual en los dos idiomas—
 * y evita tener que escribir `{ es: "19", en: "19" }` doscientas veces.
 */
export type Frase = string | Record<Idioma, string>;

export const PREDETERMINADO: Idioma = "es";

/** Para lo que llega de afuera del tipo: un `data-idioma`, una URL, una cookie. */
export const esIdioma = (x: unknown): x is Idioma =>
  typeof x === "string" && (IDIOMAS as readonly string[]).includes(x);

/** Resuelve una frase. Es la única función que elige idioma en todo el sitio. */
export const t = (idioma: Idioma, frase: Frase): string =>
  typeof frase === "string" ? frase : frase[idioma];

/**
 * El idioma predeterminado no lleva prefijo en la URL.
 *
 * `ramiroagustin.online/` es la versión en español y `…/en/` la inglesa, en
 * vez de `/es/` y `/en/` con la raíz redirigiendo. Es una URL menos, la que ya
 * está indexada no se rompe, y el sitio sigue teniendo una portada de verdad
 * en su raíz en lugar de un redirector.
 */
export const prefijo = (idioma: Idioma) =>
  idioma === PREDETERMINADO ? "" : `/${idioma}`;

/** La misma página en un idioma dado. `camino` siempre empieza y termina en `/`. */
export const ruta = (idioma: Idioma, camino: string) => `${prefijo(idioma)}${camino}`;

/** El otro idioma. Con dos, alcanza. */
export const alternar = (idioma: Idioma): Idioma => (idioma === "es" ? "en" : "es");

/**
 * Nombre de cada idioma **en ese idioma**.
 *
 * «Español», no «Spanish»: quien busca cambiar de idioma no necesariamente
 * entiende el que está viendo, así que la etiqueta tiene que estar escrita
 * para él. Es la regla que siguen todos los selectores de idioma que
 * funcionan.
 */
export const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: "Español",
  en: "English",
};

/** El código que va en `<html lang>` y en `hreflang`. */
export const ETIQUETA_HTML: Record<Idioma, string> = {
  es: "es",
  en: "en",
};

/**
 * La cookie con la que la persona pisa la detección automática.
 *
 * nginx la lee antes de mirar `Accept-Language` (ver nginx.conf): sin esto,
 * alguien con el navegador en inglés que elige español volvería al inglés en
 * la próxima visita, y el selector de idioma sería decorativo.
 */
export const COOKIE_IDIOMA = "idioma";
