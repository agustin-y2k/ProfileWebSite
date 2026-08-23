import { Container, Section } from "@sites/ui";
import { site } from "../data/site";
import styles from "./Seguimiento.module.css";

/**
 * Seguimiento de una reparación en curso.
 *
 * No renderiza nada mientras `site.seguimiento` sea null, que es lo que pasa
 * hasta que el subdominio del taller esté publicado. Es el mismo criterio que
 * usa la sección de testimonios: antes que mostrar algo que no funciona, no
 * mostrar nada.
 *
 * Va después del proceso: recién ahí alguien que ya dejó su equipo reconoce de
 * qué se le está hablando.
 */
export function Seguimiento() {
  if (!site.seguimiento) return null;

  return (
    <Section labelledBy="seguimiento-titulo" space="tight" tone="alt">
      <Container>
        <div className={styles.caja}>
          <div>
            <p className="label">Ya dejaste tu equipo</p>
            <h2 id="seguimiento-titulo" className={styles.title}>
              Seguí el estado de tu equipo
            </h2>
            <p className={styles.intro}>
              Con el número de orden que te llegó por correo podés ver en qué anda tu
              equipo, sin tener que preguntar.
            </p>
          </div>

          <a className={styles.cta} href={site.seguimiento}>
            Ver el estado de mi equipo
          </a>
        </div>
      </Container>
    </Section>
  );
}
