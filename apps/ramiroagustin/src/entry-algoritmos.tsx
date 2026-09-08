import { hydrateRoot } from "react-dom/client";
import { Algoritmos } from "./Algoritmos";
import { ProveedorIdioma } from "./i18n/contexto";
import { esIdioma, PREDETERMINADO } from "./i18n/idioma";
import "./styles/global.css";

/**
 * Entry propio, y no una rama dentro de entry-client: cada página de Vite
 * arrastra su propio grafo de módulos. Compartir el entry metería el
 * visualizador de algoritmos en el bundle de la portada, que es exactamente
 * lo que esta separación existe para evitar.
 *
 * Los dos idiomas sí comparten entry: el bundle lleva las dos versiones de
 * cada frase —son texto, pesan poco— y el idioma sale del HTML. Compilar uno
 * por idioma duplicaría el JavaScript para ahorrar unos kilobytes de cadenas.
 */
const root = document.getElementById("root");
if (root) {
  const idioma = esIdioma(root.dataset.idioma) ? root.dataset.idioma : PREDETERMINADO;

  hydrateRoot(
    root,
    <ProveedorIdioma idioma={idioma}>
      <Algoritmos />
    </ProveedorIdioma>,
  );
}
