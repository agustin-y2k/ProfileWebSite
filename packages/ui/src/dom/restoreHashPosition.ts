/**
 * Reposiciona la página sobre el elemento del `#ancla` después de que
 * terminen de cargar las fuentes.
 *
 * Al abrir una URL con hash, el navegador salta al elemento de inmediato,
 * mientras las fuentes web todavía no se aplicaron. Cuando cargan, cambian
 * las métricas del texto, el documento se re-maqueta y el destino queda
 * desplazado — a veces por cientos de píxeles si el salto era a algo que está
 * bien abajo. Este reposicionamiento corrige eso una sola vez.
 *
 * Se usa `getElementById` y no `querySelector(hash)`: un hash arbitrario
 * (por ejemplo `#123` o uno con caracteres raros) haría que querySelector
 * lance una excepción de selector inválido.
 */
export function restoreHashPosition(): void {
  const id = window.location.hash.slice(1);
  if (!id) return;

  const scrollToTarget = () => {
    const target = document.getElementById(decodeURIComponent(id));
    // `scroll-margin-top` en el destino compensa el header sticky.
    target?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  if (document.fonts?.status === "loaded") {
    scrollToTarget();
    return;
  }

  document.fonts?.ready.then(scrollToTarget).catch(() => scrollToTarget());
}
