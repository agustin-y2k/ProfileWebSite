import { Container, Reveal, Section } from "@sites/ui";
import { process } from "../data/trust";
import styles from "./Process.module.css";

/**
 * Cómo es el proceso, paso a paso.
 *
 * Va inmediatamente después del hero porque responde la objeción que frena a
 * la mayoría antes de escribir: no saber en qué se está metiendo ni cuánto va
 * a terminar pagando.
 */
export function Process() {
  return (
    <Section labelledBy="proceso-titulo" space="tight">
      <Container>
        <header className={styles.head}>
          <p className="label">Cómo trabajo</p>
          <h2 id="proceso-titulo" className={styles.title}>
            Sin sorpresas en el precio
          </h2>
          <p className={styles.intro}>
            Nada se toca antes de que sepas cuánto sale. Si no vale la pena repararlo, te
            lo digo.
          </p>
        </header>

        <ol className={styles.steps}>
          {process.map((step, i) => (
            <li key={step.number}>
              <Reveal delay={i * 70}>
                <div className={styles.step}>
                  <span className={styles.number} aria-hidden="true">
                    {step.number}
                  </span>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.description}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
