import { useEffect, useState } from "react";

/**
 * `true` una vez que la página bajó de `threshold` px.
 *
 * Lee el scroll dentro de un rAF para no forzar reflow en cada evento — el
 * patrón de escribir `style.height` directamente en el handler de scroll
 * provoca layout thrashing en cada frame.
 */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > threshold);
        frame = 0;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}
