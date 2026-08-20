import { useSyncExternalStore } from "react";

/**
 * Estado reactivo de una media query.
 *
 * Usa `useSyncExternalStore` en lugar de `useState` + `useEffect` porque el
 * snapshot de servidor es explícito: durante el prerender no existe
 * `window`, y este hook devuelve `false` sin romper la hidratación.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    // Snapshot de servidor: durante el prerender no hay viewport, así que
    // toda consulta se responde `false`. Para una `min-width` eso equivale a
    // asumir móvil; para una `max-width`, a asumir escritorio. Conviene
    // escribir las consultas sabiendo cuál de los dos lados se sirve en el
    // HTML: lo que dependa de esto aparece recién al hidratar.
    () => false,
  );
}
