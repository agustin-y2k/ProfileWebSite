import { Button, Container, Section } from "@sites/ui";
import { Prosa, useIdioma } from "../i18n/contexto";
import { ruta } from "../i18n/idioma";
import { RUTAS } from "../i18n/meta";
import styles from "./AlgoritmosBand.module.css";

/**
 * Puerta a /algoritmos/, que es una página aparte y no una sección de esta.
 *
 * Separarlas no es una decisión de diseño sino de peso: el visualizador y su
 * motor viven en el bundle de esa página, así que la portada no engorda por
 * nada de lo que se agregue allá.
 */
export function AlgoritmosBand() {
  const { idioma, t } = useIdioma();

  return (
    <Section space="tight" labelledBy="algoritmos-titulo">
      <Container>
        <div className={styles.band}>
          <span className={styles.mark} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <circle cx="5" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="19" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="12" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M6.9 7.4 10.6 16M17.1 7.4 13.4 16M7.2 6h9.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <div className={styles.text}>
            <h2 id="algoritmos-titulo" className={styles.title}>
              {t({ es: "Algoritmos, paso a paso", en: "Algorithms, step by step" })}
            </h2>
            <Prosa
              className={styles.desc}
              frase={{
                es: "Doce algoritmos de <strong>redes</strong>, <strong>estructuras</strong> e <strong>inteligencia artificial</strong>, animados con el código al lado y explicados mientras corren. Los doce andan, y cada uno trae los escenarios donde se rompe.",
                en: "Twelve algorithms from <strong>networking</strong>, <strong>data structures</strong> and <strong>artificial intelligence</strong>, animated with the code alongside and explained as they run. All twelve work, and each one ships with the scenarios where it breaks.",
              }}
            />
          </div>

          <Button href={ruta(idioma, RUTAS.algoritmos)} className={styles.cta}>
            {t({ es: "Verlos correr", en: "Watch them run" })}
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </Button>
        </div>
      </Container>
    </Section>
  );
}
