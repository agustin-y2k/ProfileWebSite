import { Container, Reveal, Section } from "@sites/ui";
import { stack } from "../data/stack";
import styles from "./Colophon.module.css";

export function Colophon() {
  return (
    <Section id="colofon" labelledBy="colofon-titulo">
      <Container>
        <header className={styles.head}>
          <p className="label">Colofón</p>
          <h2 id="colofon-titulo" className={styles.title}>
            Este sitio
          </h2>
          <p className={styles.intro}>
            La página que estás leyendo es también una muestra de trabajo: se compila a
            HTML estático y corre en una Raspberry Pi 4 en mi casa, detrás de un túnel de
            Cloudflare. Sin puertos abiertos, sin servidor alquilado.
          </p>
        </header>

        <div className={styles.grid}>
          {stack.map((entry, i) => (
            <Reveal key={entry.group} delay={i * 70}>
              <div className={styles.group}>
                <h3 className={styles.groupTitle}>{entry.group}</h3>
                <dl className={styles.spec}>
                  {entry.items.map((item) => (
                    <div key={item.name} className={styles.specRow}>
                      <dt className={styles.specName}>{item.name}</dt>
                      <dd className={styles.specNote}>{item.note}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
