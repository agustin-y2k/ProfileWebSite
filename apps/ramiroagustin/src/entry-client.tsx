import { hydrateRoot } from "react-dom/client";
import { restoreHashPosition } from "@sites/ui";
import { App } from "./App";
import { ProveedorIdioma } from "./i18n/contexto";
import { esIdioma, PREDETERMINADO } from "./i18n/idioma";
import "./styles/global.css";

/**
 * `hydrateRoot` en lugar de `createRoot`: el HTML ya viene renderizado desde
 * el build (ver scripts/prerender.mjs), así que el cliente lo adopta en vez
 * de descartarlo y volver a construir el árbol.
 *
 * El idioma se lee del `data-idioma` que el prerender dejó en el propio nodo,
 * y no de `navigator.language`: tiene que ser exactamente el mismo con el que
 * se generó este HTML, o la hidratación encontraría un árbol distinto al que
 * está en la página. Quién decide qué idioma servir es nginx, antes de todo
 * esto.
 */
const root = document.getElementById("root");
if (root) {
  const idioma = esIdioma(root.dataset.idioma) ? root.dataset.idioma : PREDETERMINADO;

  hydrateRoot(
    root,
    <ProveedorIdioma idioma={idioma}>
      <App />
    </ProveedorIdioma>,
  );
  restoreHashPosition();
}
