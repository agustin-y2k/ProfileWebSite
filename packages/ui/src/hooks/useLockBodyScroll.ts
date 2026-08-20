import { useEffect } from "react";

/**
 * Congela el scroll del body mientras un overlay está abierto.
 *
 * Compensa el ancho de la scrollbar para que el contenido no salte
 * lateralmente al abrir el menú en desktop.
 */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}
