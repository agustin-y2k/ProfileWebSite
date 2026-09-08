/**
 * Prerender estático, para todas las páginas del sitio y en los dos idiomas.
 *
 * Vite genera un `index.html` por página con un <div id="root"> vacío. Un
 * crawler que no ejecute JS vería una página en blanco — inaceptable para un
 * sitio que depende de búsqueda orgánica. Este script renderiza cada una con
 * `react-dom/server` y la inyecta en su marcador, de modo que el HTML servido
 * ya viene completo y el cliente solo hidrata.
 *
 * No lleva una lista de páginas: recorre el `dist` y le pregunta a cada HTML
 * quién es, leyendo el `data-pagina` que declara en su propio marcador. Una
 * lista acá sería una segunda fuente de verdad, y agregar una página se
 * convertiría en acordarse de tocar dos archivos.
 *
 * El idioma, en cambio, sí sale de una lista: la de src/i18n/idioma.ts, que
 * llega compilada dentro del bundle de SSR. Cada página fuente produce una
 * salida por idioma —`/` y `/en/`— con su cabecera traducida, su `lang` y su
 * `hreflang`. Vite compila **una sola** entrada por página: los dos idiomas
 * comparten el mismo JavaScript y el mismo CSS, y lo único que los distingue
 * es el HTML que este script escribe.
 */
import { mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const MARCADOR = "<!--app-html-->";
const MARCADOR_META = "<!--meta-->";

/** Todos los .html del dist, a cualquier profundidad. */
async function buscarHtml(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  const encontrados = [];

  for (const entrada of entradas) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) encontrados.push(...(await buscarHtml(ruta)));
    else if (entrada.name.endsWith(".html")) encontrados.push(ruta);
  }

  return encontrados;
}

const { render, bloqueMeta, RUTAS, ETIQUETA_HTML, IDIOMAS, prefijo } = await import(
  resolve(root, "dist-ssr/entry-server.js")
);

const archivos = await buscarHtml(dist);
let renderizadas = 0;

for (const archivo of archivos) {
  const fuente = await readFile(archivo, "utf8");

  // cv.html es un estático suelto de public/, sin marcador ni componente.
  // No tener marcador no es un error: es la señal de que no es una página React.
  if (!fuente.includes(MARCADOR)) continue;

  const nombre = fuente.match(/id="root"\s+data-pagina="([^"]+)"/)?.[1];

  if (!nombre) {
    throw new Error(
      `${relative(root, archivo)} tiene el marcador ${MARCADOR} pero no declara ` +
        `data-pagina en su <div id="root">. Sin eso no hay forma de saber qué ` +
        `componente renderizar.`,
    );
  }

  if (!fuente.includes(MARCADOR_META)) {
    throw new Error(
      `${relative(root, archivo)} no tiene el marcador ${MARCADOR_META}. Sin él la ` +
        `página saldría sin <title>, sin descripción y sin hreflang. Ver src/i18n/meta.ts.`,
    );
  }

  if (!RUTAS[nombre]) {
    throw new Error(
      `La página "${nombre}" no tiene camino declarado en RUTAS (src/i18n/meta.ts). ` +
        `Sin eso no se pueden armar ni la URL canónica ni las alternativas por idioma.`,
    );
  }

  for (const idioma of IDIOMAS) {
    const html = fuente
      .replace(MARCADOR_META, bloqueMeta(nombre, idioma))
      .replace('<html lang="es">', `<html lang="${ETIQUETA_HTML[idioma]}">`)
      .replace('data-idioma="es"', `data-idioma="${idioma}"`)
      .replace(MARCADOR, render(nombre, idioma));

    // El idioma predeterminado se escribe encima de su propia fuente; el otro
    // va a su carpeta, que puede no existir todavía.
    const destino = join(dist, prefijo(idioma), RUTAS[nombre], "index.html");
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, html, "utf8");

    const kb = (Buffer.byteLength(html, "utf8") / 1024).toFixed(1);
    console.log(
      `✓ ${relative(dist, destino).padEnd(25)} ${nombre.padEnd(11)} ${idioma}  ${kb} KB`,
    );
    renderizadas++;
  }
}

if (renderizadas === 0) {
  throw new Error(
    `No se prerenderizó ninguna página: ningún HTML de dist/ tiene ${MARCADOR}. ` +
      `Se revisó: ${archivos.map((a) => relative(dist, a)).join(", ") || "(ninguno)"}.`,
  );
}

await rm(resolve(root, "dist-ssr"), { recursive: true, force: true });
