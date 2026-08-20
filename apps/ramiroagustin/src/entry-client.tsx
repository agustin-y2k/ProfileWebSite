import { hydrateRoot } from "react-dom/client";
import { restoreHashPosition } from "@sites/ui";
import { App } from "./App";
import "./styles/global.css";

/**
 * `hydrateRoot` en lugar de `createRoot`: el HTML ya viene renderizado desde
 * el build (ver scripts/prerender.mjs), así que el cliente lo adopta en vez
 * de descartarlo y volver a construir el árbol.
 */
const root = document.getElementById("root");
if (root) {
  hydrateRoot(root, <App />);
  restoreHashPosition();
}
