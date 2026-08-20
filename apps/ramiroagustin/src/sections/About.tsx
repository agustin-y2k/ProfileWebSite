import { Container, Section } from "@sites/ui";
import styles from "./About.module.css";

export function About() {
  return (
    <Section id="sobre" labelledBy="sobre-titulo" tone="alt">
      <Container className={styles.layout}>
        <div className={styles.text}>
          <p className="label">Sobre mí</p>
          <h2 id="sobre-titulo" className={styles.title}>
            Entre el taller y el código
          </h2>
          <p>
            Soy <strong>ingeniero en informática</strong> y me muevo entre las dos puntas:
            me interesa entender cómo encajan el hardware, el software y la red cuando hay
            que resolver algo de verdad.
          </p>
          <p>
            Esa mezcla es también la razón por la que suelo encontrar la causa: un equipo
            lento no siempre es un disco, y una web caída no siempre es la web.
          </p>
        </div>

        <figure className={styles.quote}>
          <blockquote className={styles.quoteText}>
            Los malos programadores se preocupan por el código. Los buenos programadores
            se preocupan por las estructuras de datos y sus relaciones.
          </blockquote>
          <figcaption className={styles.quoteAuthor}>Linus Torvalds</figcaption>
        </figure>
      </Container>
    </Section>
  );
}
