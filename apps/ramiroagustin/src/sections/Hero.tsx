import { Button, Container } from "@sites/ui";
import { Prosa, useIdioma } from "../i18n/contexto";
import { site } from "../data/site";
import avif320 from "../assets/profile-320.avif";
import avif640 from "../assets/profile-640.avif";
import webp320 from "../assets/profile-320.webp";
import webp640 from "../assets/profile-640.webp";
import jpg320 from "../assets/profile-320.jpg";
import jpg640 from "../assets/profile-640.jpg";
import styles from "./Hero.module.css";

/** Ancho real de render del retrato: 320px en móvil, ~400px desde 62rem. */
const IMAGE_SIZES = "(min-width: 62rem) 400px, min(100vw - 3rem, 320px)";

const ficha = [
  { key: { es: "Ubicación", en: "Based in" }, value: site.location },
  {
    key: { es: "Foco", en: "Focus" },
    value: { es: "Hardware · Software · Redes", en: "Hardware · Software · Networks" },
  },
  { key: { es: "Proyecto", en: "Venture" }, value: "ByteFix" },
];

export function Hero() {
  const { t } = useIdioma();

  return (
    <section className={styles.hero} id="top">
      <Container className={styles.layout}>
        <div className={styles.copy}>
          <p className="label">{t(site.role)}</p>

          <Prosa
            as="h1"
            className={styles.title}
            frase={{
              es: `Hola, soy <span class="${styles.name}">Ramiro Agustín</span>.`,
              en: `Hi, I'm <span class="${styles.name}">Ramiro Agustín</span>.`,
            }}
          />

          <Prosa
            className={styles.subtitle}
            frase={{
              es: "Equipos que funcionan, código con criterio y redes que se sostienen en el día a día.",
              en: "Machines that work, code written with judgement, and networks that hold up day after day.",
            }}
          />

          <Prosa
            className={styles.lead}
            frase={{
              es: "Paso el día traduciendo problemas técnicos en soluciones concretas: a veces hace falta abrir el gabinete, a veces escribir un script, a veces revisar el router. Me gusta que cada cosa quede en su lugar.",
              en: "I spend my days turning technical problems into concrete fixes: sometimes that means opening the case, sometimes writing a script, sometimes going through the router. I like leaving things where they belong.",
            }}
          />

          <div className={styles.actions}>
            <Button href="#contacto" size="lg">
              {t({ es: "Escríbeme", en: "Get in touch" })}
            </Button>
            <Button href="#trabajo" variant="soft" size="lg">
              {t({ es: "Ver lo que hago", en: "See what I do" })}
            </Button>
          </div>

          <dl className={styles.ficha}>
            {ficha.map((item) => (
              <div key={item.key.es} className={styles.fichaRow}>
                <dt className="label">{t(item.key)}</dt>
                <dd className={styles.fichaValue}>{t(item.value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.visual}>
          <div className={styles.frame}>
            {/* El navegador elige el primer `source` que soporta. El orden va de
                más eficiente a más compatible; `sizes` le dice el ancho real de
                render para que no baje la variante de 640 en un móvil. */}
            <picture>
              <source
                type="image/avif"
                srcSet={`${avif320} 320w, ${avif640} 640w`}
                sizes={IMAGE_SIZES}
              />
              <source
                type="image/webp"
                srcSet={`${webp320} 320w, ${webp640} 640w`}
                sizes={IMAGE_SIZES}
              />
              <img
                src={jpg320}
                srcSet={`${jpg320} 320w, ${jpg640} 640w`}
                sizes={IMAGE_SIZES}
                width={640}
                height={640}
                alt={t({
                  es: "Retrato de Ramiro Agustín",
                  en: "Portrait of Ramiro Agustín",
                })}
                className={styles.photo}
                /* Es la imagen LCP: prioridad alta y sin lazy loading. */
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </div>
        </div>
      </Container>
    </section>
  );
}
