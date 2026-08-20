import { useMediaQuery } from "./useMediaQuery";

/** `true` si el sistema pide menos animación. Respetarlo no es opcional. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
