import { renderToString } from "react-dom/server";
import { App } from "./App";
import { Algoritmos } from "./Algoritmos";
import { ProveedorIdioma } from "./i18n/contexto";
import { IDIOMAS, type Idioma } from "./i18n/idioma";
import "./styles/global.css";

/**
 * Las páginas del sitio, por su nombre.
 *
 * La clave es la misma que cada index.html declara en `data-pagina`, y es la
 * única fuente de verdad: scripts/prerender.mjs la lee del HTML en vez de
 * llevar su propia lista, así que agregar una página no puede desincronizar
 * dos archivos. Si el nombre no existe acá, el build falla con el nombre a la
 * vista en vez de emitir una página vacía.
 */
const PAGINAS = {
  inicio: App,
  algoritmos: Algoritmos,
} as const;

export type Pagina = keyof typeof PAGINAS;

/**
 * Invocado por scripts/prerender.mjs durante el build. Nunca en runtime.
 *
 * Se llama una vez por página y por idioma, así que el HTML servido ya viene
 * traducido: nadie ve un parpadeo de español antes de que cargue el inglés, y
 * un crawler que no ejecute JavaScript indexa cada versión en su idioma.
 */
export function render(pagina: string, idioma: string): string {
  const Componente = PAGINAS[pagina as Pagina];

  if (!Componente) {
    throw new Error(
      `Página desconocida: "${pagina}". Las que existen son ${Object.keys(PAGINAS)
        .map((p) => `"${p}"`)
        .join(", ")}. Revisá el data-pagina del index.html.`,
    );
  }

  if (!IDIOMAS.includes(idioma as Idioma)) {
    throw new Error(
      `Idioma desconocido: "${idioma}". Los que existen son ${IDIOMAS.map((i) => `"${i}"`).join(", ")}.`,
    );
  }

  return renderToString(
    <ProveedorIdioma idioma={idioma as Idioma}>
      <Componente />
    </ProveedorIdioma>,
  );
}

// El prerender corre en Node y no puede importar TypeScript: todo lo que
// necesita saber sobre idiomas y cabeceras se lo pasamos por acá, que es lo
// único que se compila para él.
export { bloqueMeta, RUTAS } from "./i18n/meta";
export { ETIQUETA_HTML, IDIOMAS, prefijo } from "./i18n/idioma";
