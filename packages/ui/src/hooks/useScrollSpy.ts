import { useEffect, useState } from "react";

/**
 * Devuelve el id de la sección visible, para marcar el link activo del nav.
 *
 * El callback de IntersectionObserver solo recibe las entradas que *cambiaron*
 * de estado, no todas las observadas. Decidir la sección activa mirando nada
 * más que ese lote deja el indicador clavado en la sección anterior: al llegar
 * al final de la página, el único cambio es «la penúltima dejó de verse», y
 * como esa entrada no interseca, no queda ninguna candidata.
 *
 * Por eso se acumula el conjunto de secciones visibles entre callbacks y se
 * elige la primera en orden de documento, que es el orden de `ids`.
 *
 * `rootMargin` recorta la detección a una banda superior: sin eso, dos
 * secciones cortas quedan visibles a la vez y el indicador parpadea.
 */
export function useScrollSpy(ids: readonly string[], offset = 96): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        const first = ids.find((id) => visible.has(id));
        // Si no hay ninguna en la banda (entre secciones), se conserva la
        // última activa en lugar de apagar el indicador y hacerlo parpadear.
        if (first) setActive(first);
      },
      { rootMargin: `-${offset}px 0px -55% 0px`, threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [ids, offset]);

  return active;
}
