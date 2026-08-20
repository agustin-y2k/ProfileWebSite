import { Container, Reveal, Section } from "@sites/ui";
import { stack } from "../data/stack";
import { site } from "../data/site";
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
          <a
            className={styles.repo}
            href={site.repo}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M9 19c-4.5 1.4-4.5-2.3-6-2.7m12 4.7v-3.6a3.1 3.1 0 00-.9-2.4c2.9-.3 6-1.4 6-6.4a4.9 4.9 0 00-1.4-3.4 4.6 4.6 0 00-.1-3.4s-1.1-.3-3.6 1.4a12.3 12.3 0 00-6.4 0C6.1 1.5 5 1.8 5 1.8a4.6 4.6 0 00-.1 3.4A4.9 4.9 0 003.5 8.6c0 5 3 6.1 5.9 6.4a3.1 3.1 0 00-.9 2.4V21"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Ver el código en GitHub
          </a>
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
