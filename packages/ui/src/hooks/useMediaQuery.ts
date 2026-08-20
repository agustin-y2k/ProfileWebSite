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
    () => false, // snapshot de servidor: mobile-first por defecto
  );
}
