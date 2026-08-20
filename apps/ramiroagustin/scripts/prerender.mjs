/**
 * Prerender estático.
 *
 * Vite genera un `index.html` con un <div id="root"> vacío. Un crawler que
 * no ejecute JS vería una página en blanco — inaceptable para un sitio que
 * depende de búsqueda orgánica. Este script renderiza la app a HTML con
 * `react-dom/server` y lo inyecta en el marcador, de modo que el HTML servido
 * ya viene completo y el cliente solo hidrata.
 */
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "<!--app-html-->";

const templatePath = resolve(root, "dist/index.html");
const template = await readFile(templatePath, "utf8");

if (!template.includes(MARKER)) {
  throw new Error(`No se encontró el marcador ${MARKER} en dist/index.html`);
}

const { render } = await import(resolve(root, "dist-ssr/entry-server.js"));
const appHtml = render();

await writeFile(templatePath, template.replace(MARKER, appHtml), "utf8");
await rm(resolve(root, "dist-ssr"), { recursive: true, force: true });

const kb = (Buffer.byteLength(appHtml, "utf8") / 1024).toFixed(1);
console.log(`✓ prerender: ${kb} KB de HTML inyectados en dist/index.html`);
