import styles from "./SkipLink.module.css";

/**
 * Primer elemento enfocable de la página. Invisible hasta recibir foco:
 * quien navega con teclado o lector de pantalla se saltea el header
 * en lugar de tabular por toda la navegación en cada carga.
 */
export function SkipLink({ href = "#contenido", children = "Saltar al contenido" }) {
  return (
    <a className={styles.skip} href={href}>
      {children}
    </a>
  );
}
