import { Container, Reveal, Section } from "@sites/ui";
import { testimonials } from "../data/trust";
import styles from "./Testimonials.module.css";

/**
 * Testimonios de clientes.
 *
 * Devuelve `null` mientras no haya ninguno cargado. La sección aparece sola
 * en cuanto se agreguen entradas reales en data/trust.ts — no hay que tocar
 * App.tsx ni acordarse de "activarla".
 *
 * Deliberadamente no se muestran testimonios de ejemplo: una reseña inventada
 * es una afirmación falsa sobre el negocio, y los placeholders sobreviven
 * hasta producción con una facilidad notable.
 */
export function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <Section labelledBy="testimonios-titulo" tone="alt">
      <Container>
        <header className={styles.head}>
          <p className="label">Clientes</p>
          <h2 id="testimonios-titulo" className={styles.title}>
            Lo que dicen
          </h2>
        </header>

        <ul className={styles.grid}>
          {testimonials.map((item, i) => (
            <li key={item.name}>
              <Reveal delay={i * 70}>
                <figure className={styles.card}>
                  <blockquote className={styles.quote}>{item.text}</blockquote>
                  <figcaption className={styles.author}>
                    <span className={styles.name}>{item.name}</span>
                    {item.service ? (
                      <span className={styles.service}>{item.service}</span>
                    ) : null}
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
