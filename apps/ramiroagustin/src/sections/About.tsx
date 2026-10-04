import { Container, Section } from "@sites/ui";
import { Prosa, useIdioma } from "../i18n/contexto";
import styles from "./About.module.css";

export function About() {
  const { t } = useIdioma();

  return (
    <Section id="sobre" labelledBy="sobre-titulo" tone="alt">
      <Container>
        <div className={styles.text}>
          <h2 id="sobre-titulo" className={styles.title}>
            {t({
              es: "Entre el taller y el código",
              en: "Between the workbench and the code",
            })}
          </h2>
          <Prosa
            frase={{
              es: "Soy <strong>programador</strong> y estudiante de Ingeniería en Informática, y me muevo entre las dos puntas: me interesa entender cómo encajan el hardware, el software y la red cuando hay que resolver algo de verdad.",
              en: "I'm a <strong>software developer</strong> and a Computer Engineering student, and I work at both ends: what interests me is how hardware, software and the network fit together when something actually has to get fixed.",
            }}
          />
          <Prosa
            frase={{
              es: "Esa mezcla es también la razón por la que suelo encontrar la causa: un equipo lento no siempre es un disco, y una web caída no siempre es la web.",
              en: "That mix is also why I tend to find the actual cause: a slow machine isn't always the drive, and a website that's down isn't always the website.",
            }}
          />
        </div>
      </Container>
    </Section>
  );
}
